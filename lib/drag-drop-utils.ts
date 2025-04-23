export function createComponentData(type: string, id: string) {
  switch (type) {
    case "text":
      return {
        id,
        type,
        props: {},
      }

    case "image":
      return {
        id,
        type,
        props: {},
      }

    case "button":
      return {
        id,
        type,
        props: {},
      }

    case "section":
      return {
        id,
        type,
        props: {},
        children: [],
      }

    default:
      return {
        id,
        type: "unknown",
        props: {},
      }
  }
}
