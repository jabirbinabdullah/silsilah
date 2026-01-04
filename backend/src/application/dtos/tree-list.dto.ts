/**
 * DTO for listing family trees accessible by a user.
 * Provides minimal information for tree selection/navigation.
 */
export interface TreeListItemDTO {
  /**
   * Unique tree identifier
   */
  treeId: string;

  /**
   * Human-readable tree name/title
   * Falls back to treeId if no name is set
   */
  name: string;

  /**
   * User's role in this tree
   * - OWNER: Full control including deletion and member management
   * - EDITOR: Can create/modify persons and relationships
   * - VIEWER: Read-only access
   */
  role: 'OWNER' | 'EDITOR' | 'VIEWER';

  /**
   * Number of persons in the tree
   */
  personCount: number;

  /**
   * When the tree was created
   */
  createdAt: Date;

  /**
   * Last modification timestamp
   */
  updatedAt: Date;
}

/**
 * Response DTO for GET /trees endpoint
 */
export interface TreeListResponseDTO {
  trees: TreeListItemDTO[];
  total: number;
}
