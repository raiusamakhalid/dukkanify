import { cn } from "@/lib/utils";

/**
 * A placeholder shaped like the thing that is coming.
 *
 * The sweep is a moving highlight rather than the stock opacity pulse, and the difference is
 * not decoration: a pulsing block reads as *disabled*, a block with something travelling
 * across it reads as *filling*. The gradient and its keyframes live in `globals.css` as
 * `.shimmer`, where `prefers-reduced-motion` can reach them.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("shimmer rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
