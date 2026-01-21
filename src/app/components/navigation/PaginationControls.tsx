'use client'

import { Button } from '@/app/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/app/components/ui/pagination'
import {
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
} from 'react-icons/md'

interface Props {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

/**
 * PaginationControls:
 * - Displays pagination navigation with first, previous, next, last buttons.
 */
const PaginationControls = ({ page, totalPages, onPageChange }: Props) => {
  return (
    <Pagination className="pt-4">
      <PaginationContent className="gap-2">
        {/* Go to first page */}
        <PaginationItem>
          <Button
            variant="ghost"
            size="icon"
            disabled={page === 1}
            onClick={() => onPageChange(1)}
            aria-label="Pierwsza strona"
          >
            <MdKeyboardDoubleArrowLeft className="w-5 h-5" />
          </Button>
        </PaginationItem>

        {/* Previous page */}
        <PaginationItem>
          <Button
            variant="ghost"
            size="icon"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Poprzednia strona"
          >
            <MdKeyboardArrowLeft className="w-5 h-5" />
          </Button>
        </PaginationItem>

        {/* Page indicator */}
        <PaginationItem>
          <span className="text-sm px-3 py-1 text-muted-foreground select-none">
            {page} / {totalPages}
          </span>
        </PaginationItem>

        {/* Next page */}
        <PaginationItem>
          <Button
            variant="ghost"
            size="icon"
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Następna strona"
          >
            <MdKeyboardArrowRight className="w-5 h-5" />
          </Button>
        </PaginationItem>

        {/* Go to last page */}
        <PaginationItem>
          <Button
            variant="ghost"
            size="icon"
            disabled={page === totalPages}
            onClick={() => onPageChange(totalPages)}
            aria-label="Ostatnia strona"
          >
            <MdKeyboardDoubleArrowRight className="w-5 h-5" />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

export default PaginationControls
