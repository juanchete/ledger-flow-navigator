import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Control } from "react-hook-form";

interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectSectionProps {
  control: Control<any>;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  options: SelectOption[];
}

export const FormSelectSection: React.FC<FormSelectSectionProps> = ({
  control,
  name,
  label,
  placeholder = "Seleccionar...",
  required = false,
  className = "",
  options,
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
          <Select 
            onValueChange={field.onChange} 
            defaultValue={field.value}
          >
            <FormControl>
              <SelectTrigger className="h-10 sm:h-11">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}; 