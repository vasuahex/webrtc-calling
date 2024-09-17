
export interface ElementStyle {
    position: 'absolute';
    left: string;
    top: string;
    width: string;
    height: string;
    fontSize: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline' | 'line-through';
    textAlign: 'left' | 'center' | 'right' | 'justify';
    transform: string;
    fontFamily?: string
}

export interface DesignElement {
    id: string;
    type: 'text';
    content: string;
    style: ElementStyle;
}