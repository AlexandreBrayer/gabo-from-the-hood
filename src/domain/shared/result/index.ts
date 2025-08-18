export type Result<T, E> =
  | {
      isSuccess: true;
      isFailure: false;
      value: T;
      map: <U>(fn: (value: T) => U) => Result<U, E>;
      flatMap: <U>(fn: (value: T) => Result<U, E>) => Result<U, E>;
      mapError: <E2>(fn: (error: E) => E2) => Result<T, E2>;
      match: <U>(handlers: {
        success: (value: T) => U;
        failure: (error: E) => U;
      }) => U;
      toJSON: () => { isSuccess: boolean; value?: T; error?: E };
    }
  | {
      isSuccess: false;
      isFailure: true;
      error: E;
      map: <U>(fn: (value: T) => U) => Result<U, E>;
      flatMap: <U>(fn: (value: T) => Result<U, E>) => Result<U, E>;
      mapError: <E2>(fn: (error: E) => E2) => Result<T, E2>;
      match: <U>(handlers: {
        success: (value: T) => U;
        failure: (error: E) => U;
      }) => U;
      toJSON: () => { isSuccess: boolean; value?: T; error?: E };
    };

export type Success<T> = Result<T, never>;
export type Failure<E> = Result<never, E>;

export function success<T>(value: T): Success<T> {
  return {
    isSuccess: true,
    isFailure: false,
    value,
    map: (fn) => success(fn(value)),
    flatMap: (fn) => fn(value),
    mapError: <E2>() => success(value) as unknown as Result<T, E2>,
    match: ({ success }) => success(value),
    toJSON: () => ({ isSuccess: true, value }),
  };
}

export function failure<E>(error: E): Failure<E> {
  return {
    isSuccess: false,
    isFailure: true,
    error,
    map: () => failure(error),
    flatMap: () => failure(error),
    mapError: (fn) => failure(fn(error)),
    match: ({ failure }) => failure(error),
    toJSON: () => ({ isSuccess: false, error }),
  };
}


export type Outcome<T, E> = Success<T> | Failure<E>;

type Validator<T, E> = {
  check: <U>(fn: (value: T) => Outcome<U, E>) => Validator<U, E>;
  result: () => Outcome<T, E>;
};

export function validate<T, E>(initial: Outcome<T, E>): Validator<T, E> {
  let current = initial;

  return {
    check<U>(fn: (value: T) => Outcome<U, E>): Validator<U, E> {
      if (current.isFailure) {
        // If the current result is a failure, we return a new validator that will always fail
        return validate(current as Outcome<U, E>);
      }
      return validate(fn(current.value));
    },
    result: () => current,
  };
}
