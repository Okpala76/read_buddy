export enum BookStatus {
  QUEUED = "QUEUED",
  READING = "READING",
  COMPLETED = "COMPLETED",
}

export interface BookProps {
  id: string;
  userId: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Book {
  private readonly props: BookProps;

  private constructor(props: BookProps) {
    this.props = props;
  }

  static create(props: {
    id: string;
    userId: string;
    title: string;
    author: string;
    totalPages: number;
    currentPage: number;
    status: BookStatus;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Book {
    if (props.totalPages <= 0) {
      throw new Error("Total pages must be positive");
    }
    if (props.currentPage < 0 || props.currentPage > props.totalPages) {
      throw new Error("Current page must be between 0 and total pages");
    }
    if (props.status === BookStatus.COMPLETED) {
      if (props.currentPage !== props.totalPages) {
        throw new Error(
          "Completed book must have current page equal to total pages",
        );
      }
      if (!props.completedAt) {
        throw new Error("Completed book must have completion timestamp");
      }
    } else {
      if (props.completedAt) {
        throw new Error(
          "Non-completed book must not have completion timestamp",
        );
      }
    }
    return new Book(props);
  }

  static reconstitute(props: BookProps): Book {
    return new Book(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get title(): string {
    return this.props.title;
  }

  get author(): string {
    return this.props.author;
  }

  get totalPages(): number {
    return this.props.totalPages;
  }

  get currentPage(): number {
    return this.props.currentPage;
  }

  get status(): BookStatus {
    return this.props.status;
  }

  get completedAt(): Date | null {
    return this.props.completedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get pagesRemaining(): number {
    return this.props.totalPages - this.props.currentPage;
  }

  get progressPercent(): number {
    if (this.props.totalPages === 0) return 0;
    return Math.round((this.props.currentPage / this.props.totalPages) * 100);
  }

  isReading(): boolean {
    return this.props.status === BookStatus.READING;
  }

  isCompleted(): boolean {
    return this.props.status === BookStatus.COMPLETED;
  }

  isQueued(): boolean {
    return this.props.status === BookStatus.QUEUED;
  }

  startReading(): Book {
    if (this.props.status !== BookStatus.QUEUED) {
      throw new Error("Only queued books can be started");
    }
    return Book.reconstitute({
      ...this.props,
      status: BookStatus.READING,
      updatedAt: new Date(),
    });
  }

  complete(): Book {
    if (this.props.status !== BookStatus.READING) {
      throw new Error("Only reading books can be completed");
    }
    return Book.reconstitute({
      ...this.props,
      currentPage: this.props.totalPages,
      status: BookStatus.COMPLETED,
      completedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  updateProgress(newPage: number): Book {
    if (this.props.status !== BookStatus.READING) {
      throw new Error("Only reading books can have progress updated");
    }
    if (newPage < this.props.currentPage || newPage > this.props.totalPages) {
      throw new Error("Invalid page number");
    }
    const updates: Partial<BookProps> = {
      currentPage: newPage,
      updatedAt: new Date(),
    };
    if (newPage === this.props.totalPages) {
      updates.status = BookStatus.COMPLETED;
      updates.completedAt = new Date();
    }
    return Book.reconstitute({ ...this.props, ...updates });
  }

  requeue(): Book {
    if (this.props.status === BookStatus.COMPLETED) {
      throw new Error("Completed books cannot be requeued");
    }
    return Book.reconstitute({
      ...this.props,
      status: BookStatus.QUEUED,
      updatedAt: new Date(),
    });
  }

  toPersistence(): BookProps {
    return { ...this.props };
  }
}
