import './tooltip.css';
import Button from '../reuse/Button';
import { getTooltipStyle } from '../reuse/static';

const TooltipButton = ({ text, tooltipText, position }: { text: string, tooltipText: string, position: string }) => {
    const styles = getTooltipStyle(position);
    return (
        <div className="">
            <Button text={text} styles={styles} tooltipText={tooltipText} />
        </div>
    );
};

export default TooltipButton;
