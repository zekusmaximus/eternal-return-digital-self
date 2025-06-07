import { Object3DNode } from '@react-three/fiber';
import { Line2 } from 'three-stdlib';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      line2: Object3DNode<Line2, typeof Line2>;
    }
  }
}