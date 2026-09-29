export enum ReadingMood {
  FOCUSED = "FOCUSED",
  RELAXED = "RELAXED",
  ENERGIZED = "ENERGIZED",
  DISTRACTED = "DISTRACTED",
  TIRED = "TIRED",
}

export type MoodValue =
  "FOCUSED" | "RELAXED" | "ENERGIZED" | "DISTRACTED" | "TIRED";

export interface ReadingSessionProps {
  id: string;
  userId: string;
  bookId: string;
  startPage: number;
  endPage: number;
  pagesRead: number;
  mood: MoodValue | null;
  readAt: Date;
  createdAt: Date;
}

export class ReadingSession {
  private readonly props: ReadingSessionProps;

  private constructor(props: ReadingSessionProps) {
    this.props = props;
  }

  static create(props: {
    id: string;
    userId: string;
    bookId: string;
    startPage: number;
    endPage: number;
    pagesRead: number;
    mood: MoodValue | null;
    readAt: Date;
    createdAt: Date;
  }): ReadingSession {
    if (props.startPage < 0) {
      throw new Error("Start page must be non-negative");
    }
    if (props.endPage <= props.startPage) {
      throw new Error("End page must be greater than start page");
    }
    if (props.pagesRead !== props.endPage - props.startPage) {
      throw new Error("Pages read must equal end page minus start page");
    }
    if (props.pagesRead <= 0) {
      throw new Error("Pages read must be positive");
    }

    return new ReadingSession({
      ...props,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: ReadingSessionProps): ReadingSession {
    return new ReadingSession(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get bookId(): string {
    return this.props.bookId;
  }

  get startPage(): number {
    return this.props.startPage;
  }

  get endPage(): number {
    return this.props.endPage;
  }

  get pagesRead(): number {
    return this.props.pagesRead;
  }

  get mood(): MoodValue | null {
    return this.props.mood;
  }

  get readAt(): Date {
    return this.props.readAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toPersistence(): ReadingSessionProps {
    return { ...this.props };
  }
}

export interface LogReadingInput {
  bookId: string;
  submittedPages: number;
  mood: MoodValue | null;
  readAt?: Date;
}

export interface LogReadingResult {
  session: ReadingSession;
  newCurrentPage: number;
  wasCompleted: boolean;
}

export interface ReadingSessionRepository {
  findById(id: string, userId: string): Promise<ReadingSession | null>;
  findByUserId(
    userId: string,
    limit?: number,
    offset?: number,
  ): Promise<ReadingSession[]>;
  findByBookId(bookId: string, userId: string): Promise<ReadingSession[]>;
  findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ReadingSession[]>;
  findRecentByUserId(userId: string, limit: number): Promise<ReadingSession[]>;
  save(session: ReadingSession): Promise<void>;

  // Transactional method for logging reading with book progress update
  logReadingSession(
    userId: string,
    input: LogReadingInput,
  ): Promise<LogReadingResult>;
}
