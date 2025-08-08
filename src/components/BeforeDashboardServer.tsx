export const BeforeDashboardServer: React.FC = () => {
  return (
    <div
      style={{
        backgroundColor: '#e8f4fd',
        border: '1px solid #b3d9ff',
        borderRadius: '4px',
        marginBottom: '1rem',
        padding: '1rem',
      }}
    >
      <h4>Algolia Search Plugin Status</h4>
      <p>✅ Plugin is active and indexing content</p>
      <details>
        <summary>Plugin Information</summary>
        <ul>
          <li>Documents are automatically indexed when created or updated</li>
          <li>Deleted documents are removed from the search index</li>
          <li>Use the search box above to test your indexed content</li>
          <li>Use POST /api/algolia-sync?collection=YOUR_COLLECTION to bulk sync existing data</li>
        </ul>
      </details>
    </div>
  )
}
