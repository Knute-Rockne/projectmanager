import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-medium tracking-wide",
  {
    variants: {
      tone: {
        default: "bg-steel-soft text-steel",
        green: "bg-ontrack-soft text-ontrack-fg",
        yellow: "bg-risk-soft text-risk-fg",
        red: "bg-critical-soft text-critical-fg",
        gray: "bg-complete-soft text-complete",
        outline: "border border-border text-muted",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
