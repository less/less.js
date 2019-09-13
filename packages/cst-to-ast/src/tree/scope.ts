/**
 * What if classes, ids, variable and property lookups
 * were all just on Object prototype chains?
 * 
 * In theory, the lookups would then be blazingly fast.
 */

const getKey = (prop: string | number | symbol) => {
  let key: string = String(prop)
  if (/[a-z]/i.test(key[0])) {
    key = key.toLowerCase()
  }
  return key
}

const scopeRegistry = (entry: Object) => {
  const entries: any[] = []

  return new Proxy(entry, {
    get(obj, prop) {
      if (!prop) {
        return
      }
      if (prop === 'INHERIT') {
        return () => scopeRegistry(Object.create(obj))
      }
    
      const key: string = getKey(prop)
      switch (key[0]) {
        // property or variable lookup
        case '$':
          if (key in obj) {
            
          }
        case '@':
          if (key in obj) {
            const val: any[] = obj[key]
            if (val !== undefined) {
              return val[val.length - 1]
            }
          }
          break
        /** Mixin lookup */
        default:
          let objRef = obj
          let mixinCandidates = []
          while (objRef !== null) {
            if (objRef.hasOwnProperty(key)) {
              mixinCandidates = mixinCandidates.concat(obj[key])
            }
            objRef = Object.getPrototypeOf(objRef)
          }
          
          break

      }
    },

    set(obj, prop, value): boolean {
      if (!prop) {
        return false
      }
      const key: string = getKey(prop)

      /**
       * In the case of vars, props, and mixins, the value will be 
       * a reference to the rules holding this value
       */
      obj[key] = value
    }
  })
}

export const rootScope = scopeRegistry(Object.create(null))