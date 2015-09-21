/*flow*/

// Subclass of `T` can be expressad as follows:
// type t = <SubClass T *>
type SubClass<SuperClass, DerivedClass:SuperClass> = Class<DerivedClass>;
