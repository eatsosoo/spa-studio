import { Node, mergeAttributes } from '@tiptap/core'

export const ProductBlock = Node.create({
  name: 'productBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { productId: { default: null, parseHTML: element => Number(element.getAttribute('data-product-id')), renderHTML: attributes => ({ 'data-product-id': attributes.productId }) } }
  },
  parseHTML() { return [{ tag: 'div[data-product-id]' }] },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { class: 'article-product-node' })] },
  addCommands() {
    return { insertProduct: (productId: number) => ({ commands }) => commands.insertContent({ type: this.name, attrs: { productId } }) }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    productBlock: { insertProduct: (productId: number) => ReturnType }
  }
}
