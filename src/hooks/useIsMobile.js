import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current window width is within the mobile range.
 * @param {number} breakpoint - The width breakpoint in pixels (default: 768).
 * @returns {boolean} - True if the window width is less than or equal to the breakpoint.
 */
export default function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= breakpoint);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);

    return isMobile;
}
