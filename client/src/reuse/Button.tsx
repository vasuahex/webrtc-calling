
const Button = ({ text, tooltipText, styles, onClick }: { text: string, tooltipText: string, styles: any; onClick?: () => void }) => {
    return (
        <button className="button relative inline-block px-4 py-2 font-medium group" onClick={onClick}>
            <span className="absolute inset-0 w-full h-full transition duration-200 ease-out transform translate-x-1 translate-y-1 rounded-sm bg-black bg-opacity-60 group-hover:-translate-x-0 group-hover:-translate-y-0"></span>
            <span className="absolute inset-0 w-full h-full bg-white border-2 border-black group-hover:bg-black rounded-sm"></span>
            <span className="relative text-black group-hover:text-white">{text}</span>
            <span className="tooltip" style={styles.tooltip}>
                {tooltipText}
                <div className="tooltip-arrow" style={styles.arrow}></div>
            </span>

        </button>
    );
};

export default Button;
