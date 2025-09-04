import { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PhoneFieldProps {
  label: string;
  placeholder?: string;
  error?: FieldError;
  required?: boolean;
  className?: string;
}

export const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(
  ({ label, placeholder = "+1 (555) 123-4567", error, required, className, ...props }, ref) => {
    return (
      <div className={className}>
        <Label htmlFor={props.name} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          ref={ref}
          id={props.name}
          type="tel"
          placeholder={placeholder}
          className={`mt-1 ${error ? 'border-red-500' : ''}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error.message}</p>
        )}
      </div>
    );
  }
);

PhoneField.displayName = 'PhoneField';
