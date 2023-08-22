const express = require("express");
const app = express();
module.exports = app;

app.use(express.json());

const { format, isValid } = require("date-fns");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializationDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000);
  } catch (e) {
    console.log(`DB:error-${e.message}`);
    process.exit(1);
  }
};

initializationDBAndServer();

//Middleware Function

// API 1

app.get("/todos/", async (request, response) => {
  let listTodos;
  let listTodosQuery = null;
  let statusOnly = false;
  let priorityOnly = false;
  let statusAndPriority = false;
  let search_qOnly = false;
  let statusAndCategory = false;
  let categoryOnly = false;
  let categoryAndPriority = false;

  let text = null;

  const { status, priority, search_q, category } = request.query;
  if (
    status !== undefined &&
    priority === undefined &&
    search_q === undefined &&
    category === undefined
  ) {
    statusOnly = true;
  } else if (
    status === undefined &&
    priority !== undefined &&
    search_q === undefined &&
    category === undefined
  ) {
    priorityOnly = true;
  } else if (
    status !== undefined &&
    priority !== undefined &&
    search_q === undefined &&
    category === undefined
  ) {
    statusAndPriority = true;
  } else if (
    status === undefined &&
    priority === undefined &&
    search_q !== undefined &&
    category === undefined
  ) {
    search_qOnly = true;
  } else if (
    status !== undefined &&
    priority === undefined &&
    search_q === undefined &&
    category !== undefined
  ) {
    statusAndCategory = true;
  } else if (
    status === undefined &&
    priority === undefined &&
    search_q === undefined &&
    category !== undefined
  ) {
    categoryOnly = true;
  } else if (
    status === undefined &&
    priority !== undefined &&
    search_q === undefined &&
    category !== undefined
  ) {
    categoryAndPriority = true;
  }

  switch (true) {
    case statusOnly === true:
      listTodosQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE status='${status}';`;
      break;
    case priorityOnly === true:
      listTodosQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE priority='${priority}';`;
      break;
    case statusAndPriority === true:
      listTodosQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE status='${status}' AND priority='${priority}';`;
      break;
    case search_qOnly === true:
      listTodosQuery = ` SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE todo LIKE '%${search_q}%';`;
      break;
    case statusAndCategory === true:
      listTodosQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE status='${status}' AND category='${category}';`;
      break;
    case categoryOnly === true:
      listTodosQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE category='${category}';`;
      break;
    case categoryAndPriority === true:
      listTodosQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE priority='${priority}' AND category='${category}';`;
  }

  listTodos = await db.all(listTodosQuery);
  if (listTodos.length === 0) {
    if (status && !["TO DO", "IN PROGRESS", "DONE"].includes(status)) {
      response.status(400).send("Invalid Todo Status");
    } else if (priority && !["HIGH", "MEDIUM", "LOW"].includes(priority)) {
      response.status(400).send("Invalid Todo Priority");
    } else if (category && !["WORK", "HOME", "LEARNING"].includes(category)) {
      response.status(400).send("Invalid Todo Category");
    }
  } else {
    response.send(listTodos);
  }
});

//API 2

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE id=${todoId};`;
  const getTodo = await db.get(getTodoQuery);
  response.send(getTodo);
});

//API 3

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (!isValid(new Date(date))) {
    response.status(400).send("Invalid Due Date");
  } else {
    const newDate = format(new Date(date), "yyyy-MM-dd");
    const getAgendaQuery = `SELECT id,todo,priority,status,category,due_date AS dueDate FROM todo WHERE due_date='${newDate}';`;
    const getAgenda = await db.all(getAgendaQuery);
    response.send(getAgenda);
  }
});

//API 4

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  if (priority && !["HIGH", "MEDIUM", "LOW"].includes(priority)) {
    response.status(400).send("Invalid Todo Priority");
  } else if (status && !["TO DO", "IN PROGRESS", "DONE"].includes(status)) {
    response.status(400).send("Invalid Todo Status");
  } else if (category && !["WORK", "HOME", "LEARNING"].includes(category)) {
    response.status(400).send("Invalid Todo Category");
  } else if (!isValid(new Date(dueDate))) {
    response.status(400).send("Invalid Due Date");
  } else {
    const formattedDate = format(new Date(dueDate), "yyy-MM-dd");
    const insertTodoQuery = ` INSERT INTO 
        todo(id,todo,priority,status,category,due_date)
        VALUES (
            ${id},
            '${todo}',
            '${priority}',
            '${status}',
            '${category}',
            '${formattedDate}'
        );`;
    await db.run(insertTodoQuery);
    response.send("Todo Successfully Added");
  }
});

//API 5

app.put("/todos/:todoId/", async (request, response) => {
  let updateTodo;
  let updateTodoQuery = null;
  let text = null;
  const { todoId } = request.params;
  const { status, priority, todo, category, dueDate } = request.body;

  switch (true) {
    case status !== undefined:
      if (!["TO DO", "IN PROGRESS", "DONE"].includes(status)) {
        response.status(400).send("Invalid Todo Status");
      } else {
        updateTodoQuery = ` UPDATE todo 
            SET status= '${request.body.status}'
            WHERE id =${todoId};`;
        await db.run(updateTodoQuery);
        response.send(`Status Updated`);
      }
      break;

    case priority !== undefined:
      if (!["HIGH", "MEDIUM", "LOW"].includes(priority)) {
        response.status(400).send("Invalid Todo Priority");
      } else {
        updateTodoQuery = ` UPDATE todo 
            SET priority= '${request.body.priority}'
            WHERE id =${todoId};`;
        await db.run(updateTodoQuery);
        response.send(`Priority Updated`);
      }
      break;

    case todo !== undefined:
      updateTodoQuery = ` UPDATE todo 
        SET todo= '${request.body.todo}'
        WHERE id =${todoId};`;
      await db.run(updateTodoQuery);
      response.send(`Todo Updated`);

      break;
    case category !== undefined:
      if (!["WORK", "HOME", "LEARNING"].includes(category)) {
        response.status(400).send("Invalid Todo Category");
      } else {
        updateTodoQuery = ` UPDATE todo 
                SET category= '${request.body.category}'
                WHERE id =${todoId};`;
        await db.run(updateTodoQuery);
        response.send(`Category Updated`);
      }
      break;

    case dueDate !== undefined:
      if (!isValid(new Date(dueDate))) {
        response.status(400).send("Invalid Due Date");
      } else {
        let formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
        updateTodoQuery = ` UPDATE todo 
                    SET due_date= '${request.body.dueDate}'
                    WHERE id =${todoId};`;
        await db.run(updateTodoQuery);
        response.send(`Due Date Updated`);
      }
      break;
  }
});

//API 6

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const deleteTodoQuery = `DELETE FROM todo WHERE id=${todoId};`;
  const deleteTodo = await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});
