import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
  PaginationNext,
} from "@/components/ui/pagination";
import type { PaginationProps } from "@/types/PaginationTypes";

export const SmartPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 4,
  isLoading = false,
  className = ""
}: PaginationProps) => {
  
  if (totalPages <= 1) return null;

  const prevPage = () => onPageChange(Math.max(currentPage - 1, 1));
  const nextPage = () => onPageChange(Math.min(currentPage + 1, totalPages));

  const getPaginationInfo = () => {
    if (totalPages <= maxVisiblePages) {
      return {
        pages: Array.from({ length: totalPages }, (_, i) => i + 1),
        showStartEllipsis: false,
        showEndEllipsis: false
      };
    }

    let startPage: number;
    let endPage: number;
    let showStartEllipsis = false;
    let showEndEllipsis = false;

    if (currentPage <= 2) {
      startPage = 1;
      endPage = maxVisiblePages;
      showEndEllipsis = totalPages > maxVisiblePages;
    } else if (currentPage >= totalPages - 1) {
      startPage = totalPages - maxVisiblePages + 1;
      endPage = totalPages;
      showStartEllipsis = true;
    } else {
      startPage = currentPage - 1;
      endPage = currentPage + 2; 
      showStartEllipsis = startPage > 1;
      showEndEllipsis = endPage < totalPages;
    }

    const pages = Array.from(
      { length: endPage - startPage + 1 }, 
      (_, i) => startPage + i
    );

    return { pages, showStartEllipsis, showEndEllipsis };
  };

  const { pages, showStartEllipsis, showEndEllipsis } = getPaginationInfo();

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious 
            onClick={prevPage} 
            disabled={currentPage === 1 || isLoading}
            className={isLoading ? "opacity-50 cursor-not-allowed" : ""}
          />
        </PaginationItem>

        {showStartEllipsis && (
          <>
            <PaginationItem>
              <PaginationLink
                onClick={() => onPageChange(1)}
                isActive={currentPage === 1}
                disabled={isLoading}
                className={isLoading ? "opacity-50 cursor-not-allowed" : ""}
              >
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          </>
        )}

        {pages.map((pageNumber) => (
          <PaginationItem key={pageNumber}>
            <PaginationLink
              onClick={() => onPageChange(pageNumber)}
              isActive={currentPage === pageNumber}
              disabled={isLoading}
              className={isLoading ? "opacity-50 cursor-not-allowed" : ""}
            >
              {pageNumber}
            </PaginationLink>
          </PaginationItem>
        ))}

        {showEndEllipsis && (
          <>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink
                onClick={() => onPageChange(totalPages)}
                isActive={currentPage === totalPages}
                disabled={isLoading}
                className={isLoading ? "opacity-50 cursor-not-allowed" : ""}
              >
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          </>
        )}

        <PaginationItem>
          <PaginationNext 
            onClick={nextPage} 
            disabled={currentPage === totalPages || isLoading}
            className={isLoading ? "opacity-50 cursor-not-allowed" : ""}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};
