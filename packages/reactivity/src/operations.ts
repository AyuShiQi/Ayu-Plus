export const enum TrackOpTypes {
  GET = 'get',
  HAS = 'has',
  ITERATE = 'iterate'
}

export const enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear'
}

/**
 * 用来标记某个对象的获取key操作属性，用来标记获取key操作的副作用函数
 */
export const ITERATE_KEY = Symbol()
/**
 * 用于标记一个代理对象的原型
 */
export const RAW_KEY = Symbol()
/**
 * 用来收集keys迭代器锁所调用的值(for in)
 */
export const MAP_KEY_ITERATE_KEY = Symbol()