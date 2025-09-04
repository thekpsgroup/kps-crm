import { NextRequest, NextResponse } from 'next/server'
import { callLogs, contacts, deals } from '@/lib/server-supabase'
import { verifyWebhookSignature } from '@/lib/ringcentral'

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-ringcentral-signature') || ''
    const rawBody = await request.text()
    const body = JSON.parse(rawBody)

    console.log('RingCentral webhook received:', JSON.stringify(body, null, 2))

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error('Webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Handle different types of webhook events
    if (body.event === '/restapi/v1.0/account/~/extension/~/call-log') {
      await handleCallLogEvent(body)
    } else {
      console.log('Unhandled webhook event type:', body.event)
    }

    // Return 200 quickly as required by RingCentral
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook processing error:', error)
    // Still return 200 to acknowledge receipt, but log the error
    return NextResponse.json({ success: true })
  }
}

async function handleCallLogEvent(eventData: any) {
  try {
    const callLog = eventData.body

    if (!callLog || !Array.isArray(callLog.records)) {
      console.warn('Invalid call log format:', callLog)
      return
    }

    for (const record of callLog.records) {
      await processCallRecord(record)
    }
  } catch (error) {
    console.error('Error processing call log event:', error)
  }
}

async function processCallRecord(record: any) {
  try {
    // Extract call details
    const direction = record.direction // 'Inbound' or 'Outbound'
    const status = getCallStatus(record.result)
    const duration = record.duration || 0

    // Handle phone numbers - RingCentral format might vary
    let fromNumber = record.from?.phoneNumber || record.fromNumber
    let toNumber = record.to?.phoneNumber || record.toNumber

    // Normalize phone numbers
    if (fromNumber) fromNumber = normalizePhoneNumber(fromNumber)
    if (toNumber) toNumber = normalizePhoneNumber(toNumber)

    // For outbound calls, the 'to' number is the customer
    // For inbound calls, the 'from' number is the customer
    const customerNumber = direction === 'Outbound' ? toNumber : fromNumber

    // Try to match contact by phone number
    let matchedContact = null
    let matchedDeal = null

    if (customerNumber) {
      try {
        matchedContact = await contacts.findByPhone(customerNumber)
        if (matchedContact) {
          // Find active deals for this contact
          const activeDeals = await deals.findActiveByContact(matchedContact.id)
          matchedDeal = activeDeals[0] || null // Take the most recent active deal
        }
      } catch (error) {
        console.warn('Failed to match contact/deal for call:', customerNumber, error)
      }
    }

    // Check if we already have a record for this call
    const existingRecord = record.id ? await getExistingCallRecord(record.id) : null

    if (existingRecord) {
      // Update existing record
      await callLogs.update(record.id, {
        status,
        duration_seconds: duration,
        matched_contact_id: matchedContact?.id,
        matched_deal_id: matchedDeal?.id,
      })
      console.log('Updated call record:', record.id)
    } else {
      // Insert new record
      await callLogs.insert({
        direction: direction.toLowerCase(),
        status,
        from_number: fromNumber,
        to_number: toNumber,
        duration_seconds: duration,
        rc_call_id: record.id,
        matched_contact_id: matchedContact?.id,
        matched_deal_id: matchedDeal?.id,
      })
      console.log('Created new call record:', record.id)
    }

  } catch (error) {
    console.error('Error processing call record:', error, record)
  }
}

function getCallStatus(result?: string): string {
  if (!result) return 'unknown'

  switch (result.toLowerCase()) {
    case 'call connected':
      return 'completed'
    case 'call finished':
      return 'completed'
    case 'no answer':
      return 'missed'
    case 'busy':
      return 'busy'
    case 'rejected':
      return 'rejected'
    case 'hang up':
      return 'completed'
    default:
      return result.toLowerCase()
  }
}

function normalizePhoneNumber(phone: string): string {
  if (!phone) return phone

  // Remove all non-digit characters except +
  let normalized = phone.replace(/[^\d+]/g, '')

  // Ensure it starts with +
  if (!normalized.startsWith('+') && normalized.length >= 10) {
    // Assume US number if it doesn't start with +
    if (normalized.length === 10) {
      normalized = '+1' + normalized
    } else if (normalized.length === 11 && normalized.startsWith('1')) {
      normalized = '+' + normalized
    }
  }

  return normalized
}

async function getExistingCallRecord(rcCallId: string) {
  // This would typically be implemented in the callLogs utility
  // For now, we'll assume we need to check if a record exists
  // In a real implementation, you'd add this to the callLogs utility
  return null
}
