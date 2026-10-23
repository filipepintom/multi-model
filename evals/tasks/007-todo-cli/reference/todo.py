#!/usr/bin/env python3
"""Gestor de tarefas em linha de comandos."""

import argparse
import json
import os
import sys


def _path():
    return os.environ["TODO_FILE"]


def load():
    try:
        with open(_path(), encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"next_id": 1, "tasks": []}


def save(data):
    with open(_path(), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _find(data, task_id):
    for task in data["tasks"]:
        if task["id"] == task_id:
            return task
    print(f"todo: tarefa {task_id} não encontrada", file=sys.stderr)
    return None


def cmd_add(args):
    data = load()
    task_id = data["next_id"]
    data["next_id"] = task_id + 1
    data["tasks"].append({"id": task_id, "text": args.text, "done": False})
    save(data)
    print(task_id)
    return 0


def cmd_list(args):
    for task in sorted(load()["tasks"], key=lambda t: t["id"]):
        mark = "x" if task["done"] else " "
        print(f"{task['id']} [{mark}] {task['text']}")
    return 0


def cmd_done(args):
    data = load()
    task = _find(data, args.id)
    if task is None:
        return 1
    task["done"] = True
    save(data)
    return 0


def cmd_remove(args):
    data = load()
    task = _find(data, args.id)
    if task is None:
        return 1
    data["tasks"].remove(task)
    save(data)
    return 0


def build_parser():
    parser = argparse.ArgumentParser(prog="todo")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("add")
    p.add_argument("text")
    p.set_defaults(func=cmd_add)
    p = sub.add_parser("list")
    p.set_defaults(func=cmd_list)
    p = sub.add_parser("done")
    p.add_argument("id", type=int)
    p.set_defaults(func=cmd_done)
    p = sub.add_parser("remove")
    p.add_argument("id", type=int)
    p.set_defaults(func=cmd_remove)
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
