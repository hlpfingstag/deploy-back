import express, { NextFunction, Request, Response } from "express";
import { request } from "http";
import { v4 as uuidv4 } from "uuid";

const app = express();

app.use(express.json());

let users: User[] = [];

//Data Transfer Object
type NewUserDTO = Omit<User, "id" | "transactions">;

// Rotas
class User {
  public id: string;
  public name: string;
  public cpf: string;
  public email: string;
  public age: number;
  public transactions: Transaction[];

  constructor({ name, cpf, email, age }: NewUserDTO) {
    this.id = uuidv4();
    this.name = name;
    this.cpf = cpf;
    this.email = email;
    this.age = age;
    this.transactions = [];
  }
}

type NewTransactionDTO = Omit<Transaction, "id">;

class Transaction {
  public id: string;
  public title: string;
  public value: number;
  public type: string;

  constructor({ title, value, type }: NewTransactionDTO) {
    this.id = uuidv4();
    this.title = title;
    this.value = value;
    this.type = type;
  }
}
// Middlewares
function validateCreateUserBody(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { name, cpf, email, age } = request.body;

  if (!name || !cpf || !email || !age) {
    return response.status(422).json({ message: "Preencha todos os dados." });
  }

  next();
}

function verifyExistentCPF(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { cpf } = request.body;

  const cpfExists = users.find((p) => p.cpf === cpf);

  if (cpfExists) {
    return response
      .status(409)
      .json({ message: "Este CPF já está cadastrado" });
  }

  next();
}

function verifyExistentEmail(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { email } = request.body;

  const emailExists = users.find((p) => p.email === email);

  if (emailExists) {
    return response
      .status(409)
      .json({ message: "Este email já está cadastrado" });
  }

  next();
}

app.get("/", (request: Request, response: Response) => {
  return response.send("Exercício");
});

app.post(
  "/users",
  validateCreateUserBody,
  verifyExistentCPF,
  verifyExistentEmail,
  (request: Request, response: Response) => {
    const { name, cpf, email, age } = request.body;

    const user = new User({ name, cpf, email, age });

    users.push(user);

    console.log(users);

    return response.json(user);
  }
);

app.get("/users/:id", (request: Request, response: Response) => {
  const { id } = request.params;

  const user = users.find((p) => p.id === id);

  if (!user) {
    return response.status(404).json({ message: "Usuário não encontrado." });
  }

  return response.json({
    id: user.id,
    name: user.name,
    cpf: user.cpf,
    email: user.email,
    age: user.age,
  });
});

app.get("/users", (request: Request, response: Response) => {
  const onlyUsers = users.map((user) => ({
    id: user.id,
    name: user.name,
    cpf: user.cpf,
    email: user.email,
    age: user.age,
  }));

  return response.json(onlyUsers);
});

app.put("/users/:id", (request: Request, response: Response) => {
  const { id }: { id?: string } = request.params;
  const { name, cpf, email, age }: NewUserDTO = request.body;

  //Encontrar o registro que queremos alterar
  const userIndex = users.findIndex((f) => {
    return f.id === id;
  });

  if (userIndex < 0) {
    return response.status(404).json({
      msg: "Usuário não encontrado",
    });
  }

  users[userIndex] = {
    id,
    name,
    cpf,
    email,
    age,
    transactions: users[userIndex].transactions,
  };

  return response.status(200).json(users[userIndex]);
});

app.delete("/users/:id", (request: Request, response: Response) => {
  const { id } = request.params;

  users = users.filter((user) => user.id !== id);

  return response.status(204).json();
});

app.post(
  "/user/:userId/transactions",
  (request: Request, response: Response) => {
    const { userId } = request.params;
    const { title, type, value } = request.body;

    //Encontrar o registro que queremos alterar
    const userIndex = users.findIndex((f) => {
      return f.id === userId;
    });

    if (userIndex < 0) {
      return response.status(404).json({
        msg: "Usuário não encontrado",
      });
    }

    const transaction = new Transaction({ title, type, value });

    users[userIndex].transactions.push(transaction);

    return response.json(transaction);
  }
);

app.get(
  "/user/:userId/transactions/:transactionId",
  (request: Request, response: Response) => {
    const { userId, transactionId } = request.params;

    //Encontrar o registro que queremos alterar
    const userIndex = users.findIndex((f) => {
      return f.id === userId;
    });

    if (userIndex < 0) {
      return response.status(404).json({
        msg: "Usuário não encontrado",
      });
    }

    const transactionIndex = users[userIndex].transactions.findIndex(
      (t) => t.id === transactionId
    );

    if (transactionIndex < 0) {
      return response.status(404).json({
        msg: "Transação não encontrada",
      });
    }

    return response.json(users[userIndex].transactions[transactionIndex]);
  }
);

app.get(
  "/users/:userId/transactions",
  (request: Request, response: Response) => {
    const { userId } = request.params;

    //Encontrar o registro que queremos alterar
    const userIndex = users.findIndex((f) => {
      return f.id === userId;
    });

    // if (userIndex < 0) {
    //   return response.status(404).json({
    //     msg: "Usuário não encontrado",
    //   });
    // }

    const transactions = users[userIndex].transactions;

    // [1200, 1000, 300]

    const balance = transactions.reduce(
      (accumulator, transaction) => {
        if (transaction.type === "income") {
          accumulator.income += transaction.value;
          accumulator.total += transaction.value;
        } else if (transaction.type === "outcome") {
          accumulator.outcome += transaction.value;
          accumulator.total -= transaction.value;
        }

        return accumulator;
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      }
    );

    return response.json({ transactions, balance });
  }
);

app.put(
  "/users/:userId/transactions/:transactionId",
  (request: Request, response: Response) => {
    const { userId, transactionId } = request.params;
    const { title, value, type } = request.body;

    //Encontrar o registro que queremos alterar
    const userIndex = users.findIndex((f) => {
      return f.id === userId;
    });

    if (userIndex < 0) {
      return response.status(404).json({
        msg: "Usuário não encontrado",
      });
    }

    const transactionIndex = users[userIndex].transactions.findIndex(
      (t) => t.id === transactionId
    );

    if (transactionIndex < 0) {
      return response.status(404).json({
        msg: "Transação não encontrada",
      });
    }

    users[userIndex].transactions[transactionIndex] = {
      id: transactionId,
      title,
      value,
      type,
    };

    return response.json(users[userIndex].transactions[transactionIndex]);
  }
);

app.delete(
  "/users/:userId/transactions/:transactionId",
  (request: Request, response: Response) => {
    const { userId, transactionId } = request.params;
    const { title, value, type } = request.body;

    //Encontrar o registro que queremos alterar
    const userIndex = users.findIndex((f) => {
      return f.id === userId;
    });

    if (userIndex < 0) {
      return response.status(404).json({
        msg: "Usuário não encontrado",
      });
    }

    const transactionIndex = users[userIndex].transactions.findIndex(
      (t) => t.id === transactionId
    );

    if (transactionIndex < 0) {
      return response.status(404).json({
        msg: "Transação não encontrada",
      });
    }

    users = users.filter(
      (user) => user.transactions[transactionIndex].id !== transactionId
    );

    return response.status(204).json();
  }
);

// Subir o servidor na porta 3333
app.listen(3333, () => {
  console.log("Servidor rodando...");
});
