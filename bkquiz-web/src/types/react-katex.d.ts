declare module 'react-katex' {
  import { ComponentType } from 'react';

  export interface MathProps {
    math: string;
    errorColor?: string;
    renderError?: (error: Error) => React.ReactNode;
  }

  export const BlockMath: ComponentType<MathProps>;
  export const InlineMath: ComponentType<MathProps>;
}

