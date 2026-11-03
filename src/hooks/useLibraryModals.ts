import { useState, useCallback, startTransition } from 'react';
import { Book, Saga, BibliographicCandidate } from '../types/models';
import { ParsedEbookFile } from '../services/epubParserService';

export interface UseLibraryModalsReturn {
  // Detail modal
  detailBookId: string | null;
  setDetailBookId: React.Dispatch<React.SetStateAction<string | null>>;
  handleOpenBookDetail: (id: string) => void;
  handleOpenCardDetail: (b: Book) => void;
  handleCloseBookDetail: () => void;

  // Add / Edit book modal
  isAddEditOpen: boolean;
  setIsAddEditOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingBook: Book | null;
  setEditingBook: React.Dispatch<React.SetStateAction<Book | null>>;
  selectedInitialCandidate: BibliographicCandidate | null;
  setSelectedInitialCandidate: React.Dispatch<React.SetStateAction<BibliographicCandidate | null>>;
  selectedParsedEbook: ParsedEbookFile | null;
  setSelectedParsedEbook: React.Dispatch<React.SetStateAction<ParsedEbookFile | null>>;
  handleOpenCreateBook: () => void;
  handleOpenEditBook: (book: Book) => void;
  handleCustomizeFromDiscover: (candidate: BibliographicCandidate) => void;
  handleCloseAddEdit: () => void;

  // Import modals
  isImportOpen: boolean;
  setIsImportOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isEpubImportOpen: boolean;
  setIsEpubImportOpen: React.Dispatch<React.SetStateAction<boolean>>;
  initialEpubFiles: File[] | undefined;
  setInitialEpubFiles: React.Dispatch<React.SetStateAction<File[] | undefined>>;
  handleCloseEpubImport: () => void;

  // Auth / Install modals
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isInstallModalOpen: boolean;
  setIsInstallModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Confirm delete modals
  bookToDelete: Book | null;
  setBookToDelete: React.Dispatch<React.SetStateAction<Book | null>>;
  sagaToDelete: Saga | null;
  setSagaToDelete: React.Dispatch<React.SetStateAction<Saga | null>>;

  // Celebration & Share card
  celebrationBook: Book | null;
  setCelebrationBook: React.Dispatch<React.SetStateAction<Book | null>>;
  shareCardBook: Book | null;
  setShareCardBook: React.Dispatch<React.SetStateAction<Book | null>>;

  // Order modal
  isOrderModalOpen: boolean;
  setIsOrderModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Inbox & First login modal
  isInboxOpen: boolean;
  setIsInboxOpen: React.Dispatch<React.SetStateAction<boolean>>;
  inboxInitialTab: 'recommendations' | 'friend_requests';
  setInboxInitialTab: React.Dispatch<React.SetStateAction<'recommendations' | 'friend_requests'>>;
  isFirstLoginModalOpen: boolean;
  setIsFirstLoginModalOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Overall modal flag
  isAnyLibraryModalOpen: boolean;
}

export const useLibraryModals = (): UseLibraryModalsReturn => {
  const [detailBookId, setDetailBookId] = useState<string | null>(null);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [selectedInitialCandidate, setSelectedInitialCandidate] = useState<BibliographicCandidate | null>(null);
  const [selectedParsedEbook, setSelectedParsedEbook] = useState<ParsedEbookFile | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEpubImportOpen, setIsEpubImportOpen] = useState(false);
  const [initialEpubFiles, setInitialEpubFiles] = useState<File[] | undefined>(undefined);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState<Book | null>(null);
  const [sagaToDelete, setSagaToDelete] = useState<Saga | null>(null);
  const [celebrationBook, setCelebrationBook] = useState<Book | null>(null);
  const [shareCardBook, setShareCardBook] = useState<Book | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [inboxInitialTab, setInboxInitialTab] = useState<'recommendations' | 'friend_requests'>('recommendations');
  const [isFirstLoginModalOpen, setIsFirstLoginModalOpen] = useState(false);

  const handleOpenBookDetail = useCallback((id: string) => {
    startTransition(() => {
      setDetailBookId(id);
    });
  }, []);

  const handleOpenCardDetail = useCallback((b: Book) => {
    startTransition(() => {
      setDetailBookId(b.id);
    });
  }, []);

  const handleCloseBookDetail = useCallback(() => {
    setDetailBookId(null);
  }, []);

  const handleOpenCreateBook = useCallback(() => {
    setSelectedInitialCandidate(null);
    setSelectedParsedEbook(null);
    setEditingBook(null);
    setIsAddEditOpen(true);
  }, []);

  const handleOpenEditBook = useCallback((book: Book) => {
    setSelectedInitialCandidate(null);
    setSelectedParsedEbook(null);
    setDetailBookId(null);
    setEditingBook(book);
    setIsAddEditOpen(true);
  }, []);

  const handleCustomizeFromDiscover = useCallback((candidate: BibliographicCandidate) => {
    setEditingBook(null);
    setSelectedInitialCandidate(candidate);
    setIsAddEditOpen(true);
  }, []);

  const handleCloseAddEdit = useCallback(() => {
    setIsAddEditOpen(false);
    setSelectedInitialCandidate(null);
    setSelectedParsedEbook(null);
    setEditingBook(null);
  }, []);

  const handleCloseEpubImport = useCallback(() => {
    setIsEpubImportOpen(false);
    setInitialEpubFiles(undefined);
  }, []);

  const isAnyLibraryModalOpen = Boolean(
    isAddEditOpen ||
      detailBookId ||
      isImportOpen ||
      isEpubImportOpen ||
      isAuthModalOpen ||
      isInstallModalOpen ||
      bookToDelete ||
      sagaToDelete ||
      isInboxOpen
  );

  return {
    detailBookId,
    setDetailBookId,
    handleOpenBookDetail,
    handleOpenCardDetail,
    handleCloseBookDetail,
    isAddEditOpen,
    setIsAddEditOpen,
    editingBook,
    setEditingBook,
    selectedInitialCandidate,
    setSelectedInitialCandidate,
    selectedParsedEbook,
    setSelectedParsedEbook,
    handleOpenCreateBook,
    handleOpenEditBook,
    handleCustomizeFromDiscover,
    handleCloseAddEdit,
    isImportOpen,
    setIsImportOpen,
    isEpubImportOpen,
    setIsEpubImportOpen,
    initialEpubFiles,
    setInitialEpubFiles,
    handleCloseEpubImport,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isInstallModalOpen,
    setIsInstallModalOpen,
    bookToDelete,
    setBookToDelete,
    sagaToDelete,
    setSagaToDelete,
    celebrationBook,
    setCelebrationBook,
    shareCardBook,
    setShareCardBook,
    isOrderModalOpen,
    setIsOrderModalOpen,
    isInboxOpen,
    setIsInboxOpen,
    inboxInitialTab,
    setInboxInitialTab,
    isFirstLoginModalOpen,
    setIsFirstLoginModalOpen,
    isAnyLibraryModalOpen
  };
};
