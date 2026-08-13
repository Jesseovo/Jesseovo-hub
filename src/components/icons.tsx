import { forwardRef } from "react";
import type { SVGProps, Ref } from "react";

type SoundRingIconProps = SVGProps<SVGSVGElement> & {
  circleRef?: Ref<SVGCircleElement>;
};

export const SoundRingIcon = forwardRef<SVGSVGElement, SoundRingIconProps>(
  function SoundRingIcon({ circleRef, ...props }, ref) {
    return (
      <svg
        ref={ref}
        viewBox="0 0 96 96"
        width="96"
        height="96"
        fill="none"
        aria-hidden="true"
        {...props}
      >
        <circle
          ref={circleRef}
          cx="48"
          cy="48"
          r="44"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </svg>
    );
  },
);
