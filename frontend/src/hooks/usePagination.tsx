import { useState } from "react";

export const usePagination = (totalItems: number, itemsPerPage: number, initialPage: number = 1) => {
    const [currentPage, setCurrentPage] = useState(initialPage);

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const isLastPage = currentPage >= totalPages;
    const isFirstPage = currentPage === 1;

    const goToPage = (page: number) => {
        const validPage = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(validPage);
    };

    const nextPage = () => goToPage(currentPage + 1);
    const prevPage = () => goToPage(currentPage - 1);
    const firstPage = () => goToPage(1);
    const lastPage = () => goToPage(totalPages);

    return {
        currentPage,
        totalPages,
        isLastPage,
        isFirstPage,
        goToPage,
        nextPage,
        prevPage,
        firstPage,
        lastPage,
        setCurrentPage
    };
};