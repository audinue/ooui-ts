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
  button.classList.add(
    'm-8',
    'rounded',
    'bg-blue-600',
    'px-4',
    'py-2',
    'font-medium',
    'text-white',
    'hover:bg-blue-700'
  )
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
    this.label.classList.toggle('line-through', value)
    this.label.classList.toggle('text-gray-400', value)
    this.label.classList.toggle('font-bold', !value)
  }

  constructor(text: string) {
    super()
    this.classList.add(
      'cursor-pointer',
      'px-4',
      'py-2',
      'border-b',
      'border-gray-200'
    )
    this.label.text = text
    this.label.classList.add('font-bold')
    this.appendChild(this.label)
  }
}

export function makeTodo(): Div {
  const items = new List()
  items.classList.add(
    'mt-4',
    'divide-y',
    'divide-gray-200',
    'rounded',
    'border',
    'border-gray-200'
  )

  const heading = new Heading('Todo List')
  heading.classList.add('text-2xl', 'font-bold')
  const subtitle = new Paragraph('This is the shared todo list of the world.')
  subtitle.classList.add('text-gray-600')
  const count = new Paragraph('0 chars')
  count.classList.add('text-gray-500', 'text-sm')
  const inputForm = new Form()
  inputForm.classList.add('mt-4', 'flex', 'items-center', 'gap-2')
  const input = new Input()
  input.classList.add('rounded', 'border', 'border-gray-300', 'px-3', 'py-2')
  const addBtn = new Button('Add')
  addBtn.type = 'submit'
  addBtn.classList.add(
    'rounded',
    'bg-blue-600',
    'px-4',
    'py-2',
    'font-medium',
    'text-white',
    'hover:bg-blue-700'
  )
  const clearBtn = new Button('Clear Completed')
  clearBtn.type = 'submit'
  clearBtn.classList.add(
    'mt-4',
    'rounded',
    'bg-red-600',
    'px-4',
    'py-2',
    'font-medium',
    'text-white',
    'hover:bg-red-700'
  )

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
  app.classList.add('mx-auto', 'max-w-xl', 'p-8')
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
  div.classList.add('mx-auto', 'max-w-xl', 'p-8')
  const heading = new Heading('Ooui TypeScript/Bun port')
  heading.classList.add('text-2xl', 'font-bold')
  const list = new List()
  list.classList.add('mt-4', 'list-inside', 'list-disc')
  const items = [
    ['/button', 'Button Counter'],
    ['/todo', 'Todo List']
  ]
  for (const [href, label] of items) {
    const li = new ListItem()
    const a = new Anchor(href, label)
    a.classList.add('text-blue-600', 'hover:underline')
    li.appendChild(a)
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
