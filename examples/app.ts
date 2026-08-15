import {
  UI,
  Div,
  Heading,
  Paragraph,
  Form,
  Input,
  Button,
  List,
  ListItem,
  Anchor,
  Node
} from '../src/index'

// -- Button counter sample (port of Samples/ButtonSample.cs) --

export function makeButton(): Button {
  const button = new Button('Click me!')
  button.className = 'btn btn-primary'
  button.style.marginTop = 2
  let count = 0
  button.onClick(() => {
    count++
    button.text = `Clicked ${count} times`
  })
  return button
}

// -- Todo list sample (port of Samples/TodoSample.cs) --

export class TodoItem extends ListItem {
  private readonly label = new Div()
  private done = false

  get isDone(): boolean {
    return this.done
  }
  set isDone(value: boolean) {
    this.done = value
    this.label.style.textDecoration = value ? 'line-through' : 'none'
    this.label.style.fontWeight = value ? 'normal' : 'bold'
    this.label.style.color = value ? '#999' : '#000'
  }

  constructor(text: string) {
    super()
    this.className = 'list-group-item'
    this.style.cursor = 'pointer'
    this.label.text = text
    this.label.style.fontWeight = 'bold'
    this.appendChild(this.label)
  }
}

export function makeTodo(): Div {
  const items = new List()
  items.className = 'list-group'
  items.style.marginTop = '1em'

  const heading = new Heading('Todo List')
  const subtitle = new Paragraph('This is the shared todo list of the world.')
  const count = new Paragraph('0 chars')
  const inputForm = new Form()
  inputForm.className = 'form-inline'
  const input = new Input()
  input.className = 'form-control'
  const addBtn = new Button('Add')
  addBtn.type = 'submit'
  addBtn.className = 'btn btn-primary'
  addBtn.style.marginLeft = '1em'
  const clearBtn = new Button('Clear Completed')
  clearBtn.type = 'submit'
  clearBtn.className = 'btn btn-danger'

  function updateCount() {
    count.text = `${input.value.length} chars`
  }
  function addItem() {
    if (!input.value.trim()) return
    const item = new TodoItem(input.value)
    item.onClick(() => {
      item.isDone = !item.isDone
    })
    items.insertBefore(item, items.firstChild)
    input.value = ''
    updateCount()
  }
  addBtn.onClick(() => addItem())
  inputForm.onSubmit(() => addItem())
  input.onKeyUp(() => updateCount())
  clearBtn.onClick(() => {
    const toRemove: Node[] = []
    for (const child of items.children) {
      if (child instanceof TodoItem && child.isDone) toRemove.push(child)
    }
    for (const child of toRemove) items.removeChild(child)
  })

  const app = new Div()
  app.appendChild(heading)
  app.appendChild(subtitle)
  inputForm.appendChild(input)
  inputForm.appendChild(addBtn)
  inputForm.appendChild(count)
  app.appendChild(inputForm)
  app.appendChild(items)
  app.appendChild(clearBtn)
  return app
}

// -- Index page linking the samples --

export function makeIndex(): Div {
  const div = new Div()
  const heading = new Heading('Ooui TypeScript/Bun port')
  const list = new List()
  const items = [
    ['/button', 'Button Counter'],
    ['/todo', 'Todo List']
  ]
  for (const [href, label] of items) {
    const li = new ListItem()
    li.appendChild(new Anchor(href, label))
    list.appendChild(li)
  }
  div.appendChild(heading)
  div.appendChild(list)
  return div
}

/** Registers all sample routes on the current UI server (see src/server/UI.ts). */
export function registerRoutes(): void {
  UI.publish('/', makeIndex)
  UI.publish('/button', makeButton)
  UI.publish('/todo', makeTodo)
}

if (import.meta.main) {
  registerRoutes()
  await UI.start()
  console.log('Try http://localhost:8080/ , /button , or /todo')
}
