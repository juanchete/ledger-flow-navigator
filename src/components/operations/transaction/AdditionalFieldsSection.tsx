
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface AdditionalFieldsSectionProps {
  description: string;
  category: string;
  notes: string;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}

export const AdditionalFieldsSection: React.FC<AdditionalFieldsSectionProps> = ({
  description,
  category,
  notes,
  onDescriptionChange,
  onCategoryChange,
  onNotesChange
}) => {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Input 
          id="description" 
          placeholder="Enter transaction description" 
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="category">Category</Label>
        <Input 
          id="category" 
          placeholder="e.g. Office supplies" 
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea 
          id="notes" 
          placeholder="Additional notes..." 
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      </div>
    </>
  );
};
