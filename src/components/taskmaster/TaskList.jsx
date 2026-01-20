export default function TaskList({ tasks = [], onEdit }) {
  if (!tasks.length) {
    return (
      <p className="text-slate-500">
        No tasks yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <div
          key={task.id}
          className="p-3 bg-white border rounded-lg flex justify-between items-center"
        >
          <span>{task.title || "Untitled Task"}</span>
          {onEdit && (
            <button
              className="text-sm text-[#835879]"
              onClick={() => onEdit(task)}
            >
              Edit
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
