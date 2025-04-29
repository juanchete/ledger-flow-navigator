
import {
  Home,
  Users,
  FileText,
  Calendar,
  PieChart,
  Settings,
  Clock,
  ChevronDown,
  X,
  LucideIcon,
  LucideProps,
} from "lucide-react";

// Define the type for the icons object
type IconsType = {
  [key: string]: LucideIcon;
  home: LucideIcon;
  users: LucideIcon;
  file: LucideIcon;
  calendar: LucideIcon;
  pieChart: LucideIcon;
  settings: LucideIcon;
  clock: LucideIcon;
  logo: LucideIcon;
  close: LucideIcon;
  chevronDown: LucideIcon;
};

export const Icons: IconsType = {
  home: Home,
  users: Users,
  file: FileText,
  calendar: Calendar,
  pieChart: PieChart,
  settings: Settings,
  clock: Clock,
  logo: (props: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  close: X,
  chevronDown: ChevronDown,
};
