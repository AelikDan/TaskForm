"use client";

import { startTransition, useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";

type Status = "todo" | "doing" | "done";
type Project = { id: string; name: string; color: string };
type Task = {
  id: string;
  title: string;
  description: string;
  projectId: string;
  assignee: string;
  status: Status;
  dueDate: string;
  tag: string;
};
type Dialog = { kind: "task"; taskId?: string } | { kind: "project"; projectId?: string } | null;
type SavedBoard = { projects?: Project[]; tasks?: Task[]; selectedProjectId?: string };

const STORAGE_KEY = "devsolutions-kanban-v1";
const MEMBERS = ["Marina Costa", "Rafael Lima", "Joana Alves", "Caio Martins"];
const COLUMNS: { id: Status; label: string; tone: string }[] = [
  { id: "todo", label: "A fazer", tone: "peach" },
  { id: "doing", label: "Em andamento", tone: "blue" },
  { id: "done", label: "Concluído", tone: "green" },
];

const INITIAL_PROJECTS: Project[] = [
  { id: "studio", name: "Identidade Studio Noma", color: "coral" },
  { id: "lume", name: "Campanha Lume", color: "mint" },
  { id: "orbit", name: "App Orbit", color: "yellow" },
];

const INITIAL_TASKS: Task[] = [
  { id: "t1", title: "Apresentar conceito visual", description: "Reunir referências e apresentar duas rotas criativas para o cliente.", projectId: "studio", assignee: "Marina Costa", status: "todo", dueDate: "2026-11-02", tag: "Criação" },
  { id: "t2", title: "Revisar briefing da marca", description: "Consolidar os pontos da conversa inicial e validar escopo.", projectId: "studio", assignee: "Rafael Lima", status: "todo", dueDate: "2026-11-04", tag: "Estratégia" },
  { id: "t3", title: "Pesquisa de referências", description: "Mapear referências de identidade no segmento de hospitalidade.", projectId: "studio", assignee: "Joana Alves", status: "doing", dueDate: "2026-10-30", tag: "Pesquisa" },
  { id: "t4", title: "Explorar paleta de cores", description: "Criar opções de paleta com contraste adequado para digital.", projectId: "studio", assignee: "Caio Martins", status: "doing", dueDate: "2026-11-01", tag: "Criação" },
  { id: "t5", title: "Kick-off com cliente", description: "Alinhamento inicial realizado com o time do Studio Noma.", projectId: "studio", assignee: "Marina Costa", status: "done", dueDate: "2026-10-27", tag: "Reunião" },
  { id: "t6", title: "Definir tom de voz", description: "Diretrizes de linguagem aprovadas para a marca.", projectId: "studio", assignee: "Rafael Lima", status: "done", dueDate: "2026-10-28", tag: "Estratégia" },
  { id: "t7", title: "Roteiro do vídeo manifesto", description: "Estruturar roteiro de 30 segundos para a campanha de lançamento.", projectId: "lume", assignee: "Joana Alves", status: "doing", dueDate: "2026-11-05", tag: "Conteúdo" },
  { id: "t8", title: "Wireframe da tela inicial", description: "Definir hierarquia e fluxo principal da primeira tela do app.", projectId: "orbit", assignee: "Caio Martins", status: "todo", dueDate: "2026-11-08", tag: "Produto" },
];

const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

function Icon({ name, size = 18 }: { name: "grid" | "search" | "plus" | "more" | "calendar" | "message" | "close" | "arrow" | "folder" | "spark"; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z" /><path d="m19 14 1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1L19 14z" /></>,
  };

  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function KanbanBoard({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [selectedProjectId, setSelectedProjectId] = useState("studio");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", projectId: "studio", assignee: MEMBERS[0], status: "todo" as Status, dueDate: "", tag: "Criação" });
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    let data: SavedBoard | null = null;
    try {
      const saved = window.localStorage.getItem(`${STORAGE_KEY}:${user.id}`);
      if (saved) data = JSON.parse(saved) as SavedBoard;
    } catch {
      window.localStorage.removeItem(`${STORAGE_KEY}:${user.id}`);
    }
    startTransition(() => {
      if (data && Array.isArray(data.projects) && data.projects.length) setProjects(data.projects);
      if (data && Array.isArray(data.tasks)) setTasks(data.tasks);
      if (data?.selectedProjectId) setSelectedProjectId(data.selectedProjectId);
      setIsLoaded(true);
    });
  }, [user.id]);

  useEffect(() => {
    if (isLoaded) window.localStorage.setItem(`${STORAGE_KEY}:${user.id}`, JSON.stringify({ projects, tasks, selectedProjectId }));
  }, [projects, tasks, selectedProjectId, isLoaded, user.id]);

  const activeProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const visibleTasks = useMemo(() => tasks.filter((task) => task.projectId === activeProject?.id && `${task.title} ${task.description} ${task.assignee}`.toLowerCase().includes(search.toLowerCase())), [tasks, activeProject?.id, search]);
  const doneCount = visibleTasks.filter((task) => task.status === "done").length;
  const progress = visibleTasks.length ? Math.round((doneCount / visibleTasks.length) * 100) : 0;

  function openTaskDialog(task?: Task, status: Status = "todo") {
    setTaskForm(task ? { title: task.title, description: task.description, projectId: task.projectId, assignee: task.assignee, status: task.status, dueDate: task.dueDate, tag: task.tag } : { title: "", description: "", projectId: activeProject?.id ?? "", assignee: MEMBERS[0], status, dueDate: "", tag: "Criação" });
    setDialog({ kind: "task", taskId: task?.id });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dialog?.kind === "task") {
      if (!taskForm.title.trim()) return;
      if (dialog.taskId) {
        setTasks((current) => current.map((task) => task.id === dialog.taskId ? { ...task, ...taskForm, title: taskForm.title.trim() } : task));
      } else {
        setTasks((current) => [...current, { ...taskForm, id: crypto.randomUUID(), title: taskForm.title.trim() }]);
      }
    } else if (dialog?.kind === "project") {
      const name = projectName.trim();
      if (!name) return;
      if (dialog.projectId) {
        setProjects((current) => current.map((project) => project.id === dialog.projectId ? { ...project, name } : project));
      } else {
        const project = { id: crypto.randomUUID(), name, color: ["coral", "mint", "yellow"][projects.length % 3] };
        setProjects((current) => [...current, project]);
        setSelectedProjectId(project.id);
      }
    }
    setDialog(null);
  }

  function openProjectDialog(project?: Project) {
    setProjectName(project?.name ?? "");
    setDialog({ kind: "project", projectId: project?.id });
  }

  function deleteProject(project: Project) {
    if (projects.length < 2) return;
    if (!window.confirm(`Excluir o projeto "${project.name}" e suas tarefas?`)) return;
    const remaining = projects.filter((item) => item.id !== project.id);
    setProjects(remaining);
    setTasks((current) => current.filter((task) => task.projectId !== project.id));
    if (selectedProjectId === project.id) setSelectedProjectId(remaining[0].id);
  }

  function deleteTask(taskId: string) {
    setTasks((current) => current.filter((task) => task.id !== taskId));
    setDialog(null);
  }

  function moveTask(taskId: string, status: Status) {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status } : task));
    setDraggedTaskId(null);
  }

  function onTaskDrop(event: DragEvent<HTMLElement>, status: Status) {
    event.preventDefault();
    if (draggedTaskId) moveTask(draggedTaskId, status);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#inicio" aria-label="DevSolutions, início">
          <span className="brand-mark"><Icon name="spark" size={21} /></span>
          <span>taskform<span className="brand-period">.</span><small>DEV SOLUTIONS</small></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switcher" type="button">
          <span className="workspace-avatar">D</span><span className="workspace-name">DevSolutions Studio<small>Plano gratuito</small></span><span className="chevron">⌄</span>
        </button>

        <nav className="main-nav" aria-label="Navegação principal">
          <button type="button" className="nav-item active"><Icon name="grid" size={17} /> Quadros <span className="nav-count">{projects.length}</span></button>
          <button type="button" className="nav-item" onClick={() => setSearch(MEMBERS[0])}><span className="nav-symbol">◎</span> Minhas tarefas</button>
        </nav>

        <div className="project-heading"><span>SEUS PROJETOS</span><button type="button" className="icon-button small" aria-label="Adicionar projeto" title="Adicionar projeto" onClick={() => openProjectDialog()}><Icon name="plus" size={16} /></button></div>
        <div className="project-list">
          {projects.map((project) => (
            <div className={`project-row ${project.id === activeProject?.id ? "selected" : ""}`} key={project.id}>
              <button type="button" className="project-select" onClick={() => { setSelectedProjectId(project.id); setSearch(""); }}>
                <span className={`project-dot ${project.color}`} />
                <span className="project-title">{project.name}</span>
                <span className="project-task-count">{tasks.filter((task) => task.projectId === project.id).length}</span>
              </button>
              {project.id === activeProject?.id && <button type="button" className="project-options" aria-label={`Opções de ${project.name}`} title="Editar projeto" onClick={() => openProjectDialog(project)}><Icon name="more" size={17} /></button>}
            </div>
          ))}
        </div>
        <button className="add-project" type="button" onClick={() => openProjectDialog()}><Icon name="plus" size={16} /> Novo projeto</button>

        <div className="sidebar-bottom">
          <div className="team-card">
            <div className="team-card-top"><span className="team-icon"><Icon name="folder" size={16} /></span><span>Seu time</span><button type="button" aria-label="Mais opções"><Icon name="more" size={16} /></button></div>
            <p>Ideias boas acontecem em equipe.</p>
            <div className="avatar-stack">{MEMBERS.slice(0, 3).map((member, index) => <span className={`avatar avatar-${index + 1}`} key={member} title={member}>{initials(member)}</span>)}<span className="avatar avatar-more">+1</span></div>
          </div>
          <button className="profile-row" type="button" onClick={handleLogout} title="Sair"><span className="avatar profile-avatar">{initials(user.name)}</span><span className="profile-name">{user.name}<small>{user.role === "manager" ? "Gerente de projeto" : "Membro da equipe"} · Sair</small></span><Icon name="more" size={17} /></button>
        </div>
      </aside>

      <section className="main-panel" id="inicio">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Quadros</strong></div>
          <div className="topbar-actions">
            <label className="search-box"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar tarefas..." aria-label="Buscar tarefas" /><kbd>⌘ K</kbd></label>
            <button type="button" className="top-avatar" title={user.name}>{initials(user.name)}</button>
          </div>
        </header>

        {activeProject ? <div className="board-content">
          <div className="board-heading">
            <div>
              <div className="eyebrow"><span className={`project-dot ${activeProject.color}`} /> PROJETO</div>
              <div className="title-line"><h1>{activeProject.name}</h1><button type="button" className="icon-button title-menu" aria-label="Editar projeto" title="Editar projeto" onClick={() => openProjectDialog(activeProject)}><Icon name="more" /></button></div>
              <p className="board-subtitle">Acompanhe o trabalho do time, do primeiro rascunho à entrega.</p>
            </div>
            <div className="heading-actions"><div className="avatar-stack heading-avatars">{MEMBERS.slice(0, 3).map((member, index) => <span className={`avatar avatar-${index + 1}`} key={member} title={member}>{initials(member)}</span>)}</div><button type="button" className="invite-button" onClick={() => openTaskDialog()}><Icon name="plus" size={16} /> Nova tarefa</button></div>
          </div>

          <div className="board-meta">
            <div className="view-tabs"><button type="button" className="view-tab selected"><Icon name="grid" size={15} /> Quadro</button><button type="button" className="view-tab" onClick={() => setSearch("")}><Icon name="calendar" size={15} /> Visão geral</button></div>
            <div className="board-stats"><span><i className="stat-dot" /> {visibleTasks.length} tarefas</span><span className="stat-divider" /><span>Progresso <strong>{progress}%</strong></span><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></div>
          </div>

          <div className="board-columns">
            {COLUMNS.map((column) => {
              const columnTasks = visibleTasks.filter((task) => task.status === column.id);
              return <section className={`kanban-column ${column.tone}`} key={column.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onTaskDrop(event, column.id)} aria-label={`${column.label}: ${columnTasks.length} tarefas`}>
                <div className="column-header"><div className="column-title-wrap"><span className="column-marker" /><h2>{column.label}</h2><span className="column-count">{columnTasks.length}</span></div><button type="button" className="icon-button small" aria-label={`Adicionar tarefa em ${column.label}`} title="Adicionar tarefa" onClick={() => openTaskDialog(undefined, column.id)}><Icon name="plus" size={16} /></button></div>
                <div className="task-list">
                  {columnTasks.map((task) => <article className="task-card" key={task.id} draggable onDragStart={() => setDraggedTaskId(task.id)} onDragEnd={() => setDraggedTaskId(null)} onClick={() => openTaskDialog(task)}>
                    <div className="task-card-top"><span className={`task-tag tag-${task.tag.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}>{task.tag}</span><button type="button" className="card-menu" aria-label={`Editar ${task.title}`} onClick={(event) => { event.stopPropagation(); openTaskDialog(task); }}><Icon name="more" size={16} /></button></div>
                    <h3>{task.title}</h3>
                    {task.description && <p className="task-description">{task.description}</p>}
                    <div className="task-card-footer"><div className={`avatar task-avatar avatar-${(MEMBERS.indexOf(task.assignee) % 4) + 1}`} title={task.assignee}>{initials(task.assignee)}</div><div className={`due-date ${task.dueDate && task.dueDate < "2026-10-29" && task.status !== "done" ? "overdue" : ""}`}><Icon name="calendar" size={14} />{task.dueDate ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${task.dueDate}T12:00:00`)).replace(".", "") : "Sem prazo"}</div><span className="task-comments"><Icon name="message" size={14} /> 2</span></div>
                  </article>)}
                  {columnTasks.length === 0 && <div className="empty-column">{search ? "Nenhuma tarefa encontrada" : "Solte uma tarefa aqui"}</div>}
                </div>
                <button className="column-add" type="button" onClick={() => openTaskDialog(undefined, column.id)}><Icon name="plus" size={16} /> Adicionar tarefa</button>
              </section>;
            })}
          </div>
          <footer className="board-footer"><span><span className="footer-pulse" /> Atualizado agora</span><span>Últimos 7 dias <Icon name="arrow" size={13} /></span></footer>
        </div> : <div className="no-project"><h1>Crie seu primeiro projeto</h1><p>Organize as tarefas do time em um quadro visual.</p><button className="invite-button" type="button" onClick={() => openProjectDialog()}><Icon name="plus" size={16} /> Novo projeto</button></div>}
      </section>

      {dialog && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
        <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-header"><div><span className="modal-kicker">{dialog.kind === "task" ? dialog.taskId ? "ATUALIZAR ITEM" : "NOVO ITEM" : dialog.projectId ? "CONFIGURAR QUADRO" : "NOVO QUADRO"}</span><h2 id="modal-title">{dialog.kind === "task" ? dialog.taskId ? "Editar tarefa" : "Criar tarefa" : dialog.projectId ? "Editar projeto" : "Criar projeto"}</h2></div><button type="button" className="icon-button" aria-label="Fechar" onClick={() => setDialog(null)}><Icon name="close" /></button></div>
          <form onSubmit={handleSubmit}>
            {dialog.kind === "task" ? <div className="form-fields">
              <label className="form-field full"><span>Título</span><input autoFocus required value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} placeholder="Ex.: Preparar apresentação" /></label>
              <label className="form-field full"><span>Descrição</span><textarea rows={3} value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} placeholder="Contexto e próximos passos..." /></label>
              <label className="form-field"><span>Projeto</span><select value={taskForm.projectId} onChange={(event) => setTaskForm({ ...taskForm, projectId: event.target.value })}>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
              <label className="form-field"><span>Status</span><select value={taskForm.status} onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value as Status })}>{COLUMNS.map((column) => <option value={column.id} key={column.id}>{column.label}</option>)}</select></label>
              <label className="form-field"><span>Responsável</span><select value={taskForm.assignee} onChange={(event) => setTaskForm({ ...taskForm, assignee: event.target.value })}>{MEMBERS.map((member) => <option key={member}>{member}</option>)}</select></label>
              <label className="form-field"><span>Prazo</span><input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} /></label>
              <label className="form-field"><span>Categoria</span><select value={taskForm.tag} onChange={(event) => setTaskForm({ ...taskForm, tag: event.target.value })}>{["Criação", "Estratégia", "Pesquisa", "Conteúdo", "Produto", "Reunião"].map((tag) => <option key={tag}>{tag}</option>)}</select></label>
            </div> : <label className="form-field full project-name-field"><span>Nome do projeto</span><input autoFocus required value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Ex.: Lançamento de marca" /></label>}
            <div className="modal-actions">
              {dialog.kind === "task" && dialog.taskId && <button type="button" className="delete-button" onClick={() => deleteTask(dialog.taskId!)}>Excluir tarefa</button>}
              {dialog.kind === "project" && dialog.projectId && projects.length > 1 && <button type="button" className="delete-button" onClick={() => { const project = projects.find((item) => item.id === dialog.projectId); if (project) deleteProject(project); setDialog(null); }}>Excluir projeto</button>}
              <span className="action-spacer" /><button type="button" className="cancel-button" onClick={() => setDialog(null)}>Cancelar</button><button type="submit" className="save-button">{dialog.kind === "task" ? dialog.taskId ? "Salvar alterações" : "Criar tarefa" : dialog.projectId ? "Salvar projeto" : "Criar projeto"}</button>
            </div>
          </form>
        </section>
      </div>}
    </main>
  );
}
