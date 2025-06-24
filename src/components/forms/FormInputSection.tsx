import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Control } from "react-hook-form";

interface FormInputSectionProps {
  control: Control<any>;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  isTextarea?: boolean;
  step?: string;
  min?: string;
  max?: string;
}

export const FormInputSection: React.FC<FormInputSectionProps> = ({
  control,
  name,
  label,
  type = "text",
  placeholder,
  required = false,
  className = "",
  isTextarea = false,
  step,
  min,
  max,
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel className="text-sm sm:text-base">
            {label} {required && '*'}
          </FormLabel>
          <FormControl>
            {isTextarea ? (
              <Textarea 
                {...field} 
                className="min-h-[80px] sm:min-h-[100px] text-base resize-none"
                placeholder={placeholder}
              />
            ) : (
              <Input 
                type={type}
                step={step}
                min={min}
                max={max}
                {...field} 
                className="h-10 sm:h-11 text-base"
                placeholder={placeholder}
              />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}; 