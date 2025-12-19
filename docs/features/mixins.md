// ...existing code...
### Namespaces are not mixins — correct usage of default()

Invalid code:

```less
#sp_1 {
  #sp_2 {
    .mixin() when not(default()) { /* */ }
  }
}
```

Why it's wrong
- The `default()` guard only applies to mixins and their parameters, not to namespaces.
- Namespaces (`#sp_1`, `#sp_2`) are logical groups and do not participate in `default()` logic.
- In the invalid example the mixin is defined but never called; putting `when(default())` on namespaces has no effect.

Fixed guidance and examples
- Place `default()` guards on mixin parameters or mixin definitions themselves.
- Namespaced mixins can still use `default()` — the guards must be on the mixin, not the namespace.

Correct (guards on mixin parameters):

```less
.mixin(@a: default()) when (default(@a)) {
  /* default implementation */
}
.mixin(@a) when not(default(@a)) {
  /* non-default implementation / override */
}

/* calling the mixin */
.selector {
  .mixin();        /* uses default implementation */
  .mixin(42);      /* uses non-default implementation */
}
```

Correct with namespaces (mixin defined inside namespaces but guards still on the mixin):

```less
#sp_1 {
  #sp_2 {
    .mixin(@a: default()) when (default(@a)) {
      /* default implementation */
    }
    .mixin(@a) when not(default(@a)) {
      /* override implementation */
    }
  }
}

/* call the namespaced mixin by its full path */
.selector {
  #sp_1 #sp_2 .mixin();   /* default */
  #sp_1 #sp_2 .mixin(5);  /* override */
}
```

// ...existing code...