
import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  backLink?: string;
  backText?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  backLink = "/",
  backText = "Volver"
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={backLink}>
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-2">{backText}</span>
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      </div>
    </div>
  );
};
