// Only the Tasks Section Transformed into Dynamic Kanban Board with Firestore

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { toast } from "@/hooks/use-toast";

const statusColumns = ["To Do", "In Progress", "Review", "Completed"];

const KanbanTasks = ({ projectId }) => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const tasksRef = collection(db, "projects", projectId, "tasks");
    const unsubscribe = onSnapshot(tasksRef, (snapshot) => {
      const fetchedTasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(fetchedTasks);
    });
    return () => unsubscribe();
  }, [projectId]);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const task = tasks.find((t) => t.id === active.id);
    const newStatus = over.id;

    if (task.status !== newStatus) {
      const taskDocRef = doc(db, "projects", projectId, "tasks", task.id);
      await updateDoc(taskDocRef, { status: newStatus });
      toast({
        title: "Task Updated",
        description: `Task "${task.title}" moved to ${newStatus}`,
        variant: "default",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statusColumns.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasks.filter((t) => t.status === status)}
              />
            ))}
          </div>
        </DndContext>
      </CardContent>
    </Card>
  );
};

const KanbanColumn = ({ status, tasks }) => {
  const { setNodeRef } = useDroppable({ id: status });

  const getColumnBgColor = (status: string) => {
    switch (status) {
      case "To Do":
        return "bg-gray-100";
      case "In Progress":
        return "bg-blue-50";
      case "Review":
        return "bg-yellow-50";
      case "Completed":
        return "bg-green-50";
      default:
        return "bg-white";
    }
  };
  return (
    <div
      ref={setNodeRef}
      className={`p-4 rounded min-h-[300px] ${getColumnBgColor(status)}`}
    >
      <h3 className="text-lg font-semibold mb-3">{status}</h3>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {tasks.map((task) => (
          <KanbanTaskCard key={task.id} task={task} />
        ))}
      </SortableContext>
    </div>
  );
};

const KanbanTaskCard = ({ task }) => {
  const { attributes, listeners, setNodeRef, transform } =
    useDraggable({ id: task.id });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-blue-100 text-blue-800";
      case "Review":
        return "bg-yellow-100 text-yellow-800";
      case "To Do":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: transform
          ? `translate(${transform.x}px, ${transform.y}px)`
          : undefined,
      }}
      className={`p-3 mb-3 rounded shadow cursor-move ${getStatusColor(
        task.status
      )}`}
    >
      <div className="flex justify-between mb-1">
        <h4 className="font-bold text-sm">{task.title}</h4>
        <Badge
          variant="outline"
          className={`text-xs ${getPriorityColor(task.priority)}`}
        >
          {task.priority}
        </Badge>
      </div>
      <p className="text-xs font-bold text-gray-500">{task.description}</p>
    </div>
  );
};

export default KanbanTasks;
