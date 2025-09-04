import { forwardRef } from 'react';
import { FieldError } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TextFieldProps {
  label: string;
  placeholder?: string;
  error?: FieldError;
  required?: boolean;
  className?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, placeholder, error, required, className, ...props }, ref) => {
    return (
      <div className={className}>
        <Label htmlFor={props.name} className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <Input
          ref={ref}
          id={props.name}
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

TextField.displayName = 'TextField';
