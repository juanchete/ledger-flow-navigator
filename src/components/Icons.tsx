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
  CreditCard,
  DollarSign,
  Calculator,
  Building,
  Receipt,
  LucideIcon,
  LucideProps,
  Loader2,
} from "lucide-react";
import { forwardRef } from "react";

// Define the type for the icons object with proper typing
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
  creditCard: LucideIcon;
  dollarSign: LucideIcon;
  calculator: LucideIcon;
  building: LucideIcon;
  receipt: LucideIcon;
  spinner: LucideIcon;
};

// Create a custom logo icon that matches the LucideIcon type
const LogoIcon = forwardRef<SVGSVGElement, LucideProps>((props, ref) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    ref={ref}
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
));

LogoIcon.displayName = "LogoIcon";

export const Icons: IconsType = {
  home: Home,
  users: Users,
  file: FileText,
  calendar: Calendar,
  pieChart: PieChart,
  settings: Settings,
  clock: Clock,
  logo: LogoIcon,
  close: X,
  chevronDown: ChevronDown,
  creditCard: CreditCard,
  dollarSign: DollarSign,
  calculator: Calculator,
  building: Building,
  receipt: Receipt,
  spinner: Loader2,
};
