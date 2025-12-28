/**
 * Render Data Adapter Layer
 * 
 * Explicit boundary between API DTOs and component view models.
 * Components MUST NOT access raw API DTOs directly.
 * All DTO transformations happen here.
 * 
 * @module renderDataAdapter
 */

import type { TreeRenderV1, RenderNode, RenderEdgeData } from '../api';
import type { GenealogyHierarchyResult } from '../utils/genealogyHierarchy';
import { buildGenealogyHierarchy } from '../utils/genealogyHierarchy';

/**
 * View model for tree visualization components.
 * Decoupled from API DTO structure.
 */
export interface TreeViewModel {
  readonly treeId: string;
  readonly nodes: readonly ViewNode[];
  readonly edges: readonly ViewEdge[];
}

/**
 * View model for a person node in the tree.
 */
export interface ViewNode {
  readonly id: string;
  readonly displayName: string;
}

/**
 * View model for a relationship edge.
 */
export interface ViewEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly type: 'spouse' | 'parent-child';
}

/**
 * View model for hierarchical tree visualization.
 */
export interface HierarchyViewModel {
  readonly root: any; // D3 hierarchy structure
  readonly nodeMap: ReadonlyMap<string, any>;
  readonly generations: readonly any[];
  readonly isSyntheticRoot: boolean;
}

/**
 * RenderDataAdapter - Transforms API DTOs into component view models.
 * 
 * Responsibilities:
 * - Convert TreeRenderV1 DTO to TreeViewModel
 * - Convert GenealogyHierarchyResult to HierarchyViewModel
 * - Normalize edge formats (handle legacy fields)
 * - Freeze data to prevent mutations
 * 
 * Anti-patterns to avoid:
 * - Components accessing TreeRenderV1 directly
 * - Business logic in this adapter (delegate to utils)
 * - Mutable view models
 */
export class RenderDataAdapter {
  /**
   * Converts API TreeRenderV1 DTO to component TreeViewModel.
   * Normalizes legacy edge formats.
   * 
   * @param dto - Raw API DTO
   * @returns Immutable view model for components
   */
  static toTreeViewModel(dto: TreeRenderV1): TreeViewModel {
    // Normalize edges: prefer unified format, fallback to legacy
    const edges = this.normalizeEdges(dto);
    
    return Object.freeze({
      treeId: dto.treeId,
      nodes: Object.freeze(dto.nodes.map(n => this.toViewNode(n))),
      edges: Object.freeze(edges.map(e => this.toViewEdge(e))),
    });
  }

  /**
   * Converts RenderNode DTO to ViewNode.
   */
  private static toViewNode(node: RenderNode): ViewNode {
    return Object.freeze({
      id: node.id,
      displayName: node.displayName,
    });
  }

  /**
   * Converts RenderEdgeData DTO to ViewEdge.
   */
  private static toViewEdge(edge: RenderEdgeData): ViewEdge {
    return Object.freeze({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
    });
  }

  /**
   * Normalizes edge data from TreeRenderV1.
   * Handles both new unified format and legacy separate arrays.
   * 
   * @param dto - TreeRenderV1 DTO
   * @returns Normalized edge array
   */
  private static normalizeEdges(dto: TreeRenderV1): readonly RenderEdgeData[] {
    // If new unified edges format exists, use it
    if (dto.edges && dto.edges.length > 0) {
      return dto.edges;
    }

    // Fallback to legacy format
    const edges: RenderEdgeData[] = [];

    if (dto.parentChildEdges) {
      for (const edge of dto.parentChildEdges) {
        edges.push({
          id: `pc-${edge.personAId}-${edge.personBId}`,
          source: edge.personAId,
          target: edge.personBId,
          type: 'parent-child',
        });
      }
    }

    if (dto.spouseEdges) {
      for (const edge of dto.spouseEdges) {
        edges.push({
          id: `sp-${edge.personAId}-${edge.personBId}`,
          source: edge.personAId,
          target: edge.personBId,
          type: 'spouse',
        });
      }
    }

    return edges;
  }

  /**
   * Converts GenealogyHierarchyResult to HierarchyViewModel.
   * Provides stable interface for hierarchical components.
   * 
   * @param hierarchy - Hierarchy result from buildGenealogyHierarchy()
   * @returns View model for hierarchical visualization
   */
  static toHierarchyViewModel(hierarchy: GenealogyHierarchyResult): HierarchyViewModel {
    return Object.freeze({
      root: hierarchy.root,
      nodeMap: hierarchy.nodeMap,
      generations: hierarchy.generations,
      isSyntheticRoot: hierarchy.isSyntheticRoot,
    });
  }

  /**
   * Extracts node IDs from TreeViewModel.
   * Useful for search/filter operations.
   */
  static extractNodeIds(viewModel: TreeViewModel): readonly string[] {
    return viewModel.nodes.map(n => n.id);
  }

  /**
   * Finds a node by ID in TreeViewModel.
   */
  static findNodeById(viewModel: TreeViewModel, nodeId: string): ViewNode | undefined {
    return viewModel.nodes.find(n => n.id === nodeId);
  }

  /**
   * Validates that TreeViewModel has required structure.
   * Throws if invalid.
   */
  static validate(viewModel: TreeViewModel): void {
    if (!viewModel.treeId) {
      throw new Error('TreeViewModel must have treeId');
    }
    if (!Array.isArray(viewModel.nodes)) {
      throw new Error('TreeViewModel.nodes must be an array');
    }
    if (!Array.isArray(viewModel.edges)) {
      throw new Error('TreeViewModel.edges must be an array');
    }
  }

  /**
   * Builds hierarchical model from API DTO.
   * IMPORTANT: This is the ONLY place hierarchy construction should happen.
   * UI components must NEVER call buildGenealogyHierarchy directly.
   * 
   * @param dto - Raw TreeRenderV1 DTO from API
   * @param options - Optional root person ID for hierarchy construction
   * @returns Immutable hierarchy model for rendering
   */
  static buildHierarchyModel(
    dto: TreeRenderV1,
    options?: { rootPersonId?: string }
  ): HierarchyViewModel {
    // Normalize edges first (handle legacy formats)
    const normalizedDto: TreeRenderV1 = dto.edges && dto.edges.length > 0
      ? dto
      : { ...dto, edges: this.normalizeEdges(dto) };

    // Build hierarchy using domain logic
    const hierarchy = buildGenealogyHierarchy(normalizedDto, options);

    // Convert to view model
    return this.toHierarchyViewModel(hierarchy);
  }
}
