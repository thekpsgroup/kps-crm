'use client';

import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/lib/supabase-client';
import { DealWithRelations, DealStage, KanbanColumn } from '@/types/deals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppShell } from '@/components/layout/app-shell';
import Link from 'next/link';

export default function DealsPage() {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDeals();
  }, []);

  const loadDeals = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load stages
      const { data: stages, error: stagesError } = await supabase
        .from('deal_stages')
        .select('*')
        .order('position');

      if (stagesError) throw stagesError;

      // Load deals with relations
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select(`
          *,
          company:companies(id, name),
          contact:contacts(id, first_name, last_name, email),
          stage:deal_stages(id, name)
        `)
        .order('created_at', { ascending: false });

      if (dealsError) throw dealsError;

      // Group deals by stage
      const columnsData: KanbanColumn[] = stages.map((stage: DealStage) => ({
        id: stage.id,
        title: stage.name,
        deals: deals.filter((deal: DealWithRelations) => deal.stage_id === stage.id) || []
      }));

      setColumns(columnsData);
    } catch (err) {
      console.error('Error loading deals:', err);
      setError(err instanceof Error ? err.message : 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // If no destination or dropped in same position
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    const sourceColumnId = source.droppableId;
    const destColumnId = destination.droppableId;

    // Optimistic update
    setColumns(prevColumns => {
      const newColumns = [...prevColumns];
      const sourceColIndex = newColumns.findIndex(col => col.id === sourceColumnId);
      const destColIndex = newColumns.findIndex(col => col.id === destColumnId);

      if (sourceColIndex === -1 || destColIndex === -1) return prevColumns;

      const sourceCol = newColumns[sourceColIndex];
      const destCol = newColumns[destColIndex];
      const [movedDeal] = sourceCol.deals.splice(source.index, 1);

      // Update the deal's stage_id
      movedDeal.stage_id = destColumnId;

      destCol.deals.splice(destination.index, 0, movedDeal);

      return newColumns;
    });

    // Persist to database
    try {
      const { error } = await supabase
        .from('deals')
        .update({ stage_id: destColumnId })
        .eq('id', draggableId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating deal stage:', err);
      // Revert optimistic update on error
      loadDeals();
      setError('Failed to update deal stage');
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading deals...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Error Loading Deals</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={loadDeals}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Deals Pipeline</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your sales deals across different stages
                </p>
              </div>
              <Link
                href="/"
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 overflow-x-auto pb-6">
              {columns.map((column) => (
                <div key={column.id} className="min-w-[280px]">
                  <Card className="rounded-2xl shadow-sm overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between text-base">
                        {column.title}
                        <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          {column.deals.length}
                        </span>
                      </CardTitle>
                    </CardHeader>

                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-4 min-h-[400px] transition-colors ${
                            snapshot.isDraggingOver ? 'bg-muted/50' : ''
                          }`}
                        >
                          {column.deals.map((deal, index) => (
                            <Draggable key={deal.id} draggableId={deal.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-background border border-border rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-200 ${
                                    snapshot.isDragging
                                      ? 'shadow-lg rotate-2 scale-105'
                                      : 'hover:scale-[1.02]'
                                  }`}
                                >
                                  <h3 className="font-medium text-foreground mb-2 line-clamp-2">
                                    {deal.title}
                                  </h3>

                                  {deal.amount && (
                                    <p className="text-lg font-semibold text-primary mb-2">
                                      {formatCurrency(deal.amount)}
                                    </p>
                                  )}

                                  {deal.contact && (
                                    <div className="text-sm text-muted-foreground">
                                      <p className="truncate">
                                        {deal.contact.first_name} {deal.contact.last_name}
                                      </p>
                                      {deal.contact.email && (
                                        <p className="truncate text-xs">{deal.contact.email}</p>
                                      )}
                                    </div>
                                  )}

                                  {deal.company && (
                                    <div className="mt-2 pt-2 border-t border-border">
                                      <p className="text-sm font-medium text-foreground truncate">
                                        {deal.company.name}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </Card>
                </div>
              ))}
            </div>
          </DragDropContext>

          {columns.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">No Deals Found</h2>
              <p className="text-muted-foreground">
                Make sure your database is set up and seeded with data.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
