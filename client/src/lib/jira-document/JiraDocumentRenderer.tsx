import { ReactNode } from 'react';
import {
  JiraAdfDocument,
  JiraAdfInlineNode,
  JiraAdfNode,
  JiraMark,
} from './types';

interface JiraDocumentRendererProps {
  document: JiraAdfDocument;
  className?: string;
}

function renderMarkedText(text: string, marks?: Array<{ type: JiraMark }>): ReactNode {
  if (!marks?.length) {
    return text;
  }

  return marks.reduce<ReactNode>((content, mark) => {
    switch (mark.type) {
      case 'strong':
        return <strong>{content}</strong>;
      case 'em':
        return <em>{content}</em>;
      case 'underline':
        return <u>{content}</u>;
      default:
        return content;
    }
  }, text);
}

function renderInlineContent(nodes: JiraAdfInlineNode[] | undefined): ReactNode {
  if (!nodes?.length) {
    return '\u00A0';
  }

  return nodes.map((node, index) => {
    if (node.type === 'hardBreak') {
      return <br key={`break-${index}`} />;
    }
    return (
      <span key={index}>{renderMarkedText(node.text, node.marks)}</span>
    );
  });
}

function renderHeading(node: Extract<JiraAdfNode, { type: 'heading' }>, index: number) {
  const level = node.attrs.level;
  const content = renderInlineContent(node.content);

  if (level === 1) {
    return (
      <h2 key={index} className="jira-document-h1">
        {content}
      </h2>
    );
  }
  if (level === 3) {
    return (
      <h4 key={index} className="jira-document-h3">
        {content}
      </h4>
    );
  }
  return (
    <h3 key={index} className="jira-document-h2">
      {content}
    </h3>
  );
}

function renderAdfNode(node: JiraAdfNode, index: number): ReactNode {
  switch (node.type) {
    case 'heading':
      return renderHeading(node, index);
    case 'paragraph':
      return (
        <p key={index} className="jira-document-p">
          {renderInlineContent(node.content)}
        </p>
      );
    case 'bulletList':
      return (
        <ul key={index} className="jira-document-ul">
          {node.content.map((item, itemIndex) => (
            <li key={itemIndex}>
              {renderInlineContent(item.content[0]?.content)}
            </li>
          ))}
        </ul>
      );
    case 'orderedList':
      return (
        <ol key={index} className="jira-document-ol">
          {node.content.map((item, itemIndex) => (
            <li key={itemIndex}>
              {renderInlineContent(item.content[0]?.content)}
            </li>
          ))}
        </ol>
      );
    case 'table': {
      const rows = node.content;
      const headerRow = rows[0];
      const headers =
        headerRow?.content
          .filter((cell) => cell.type === 'tableHeader')
          .map((cell) => cell.content[0]?.content ?? []) ?? [];
      const dataRows = rows.slice(headers.length > 0 ? 1 : 0);

      return (
        <div key={index} className="jira-document-table-wrap">
          <table className="jira-document-table">
            {headers.length > 0 && (
              <thead>
                <tr>
                  {headers.map((headerContent, headerIndex) => (
                    <th key={headerIndex}>
                      {renderInlineContent(headerContent)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {dataRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.content.map((cell, cellIndex) => (
                    <td key={cellIndex}>
                      {renderInlineContent(cell.content[0]?.content)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    default:
      return null;
  }
}

export function JiraDocumentRenderer({
  document,
  className = '',
}: JiraDocumentRendererProps) {
  if (!document?.content?.length) {
    return null;
  }

  return (
    <div className={`jira-document ${className}`.trim()}>
      {document.content.map((node, index) => renderAdfNode(node, index))}
    </div>
  );
}
