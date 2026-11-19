export interface CalendarFieldProps {
    value?: string;
    onChange: (v: string) => void;
    disableFuture?: boolean;
    className?: string;
}
