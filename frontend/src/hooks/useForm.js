import { useCallback, useState } from 'react';
import { serverFieldErrors, getErrorMessage } from '../utils/format';

// Small form helper: values, field errors, submit state and server-error mapping.
// validate(values) -> { field: 'message' } (falsy entries ignored)
export default function useForm({ initialValues, validate, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const setValue = useCallback((name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValue(name, type === 'checkbox' ? checked : value);
  }, [setValue]);

  const reset = useCallback((next = initialValues) => {
    setValues(next); setErrors({}); setFormError('');
  }, [initialValues]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    setFormError('');
    const found = validate ? validate(values) : {};
    const clean = Object.fromEntries(Object.entries(found).filter(([, v]) => v));
    setErrors(clean);
    if (Object.keys(clean).length) return;

    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      const fields = serverFieldErrors(err);
      if (Object.keys(fields).length) setErrors(fields);
      setFormError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }, [values, validate, onSubmit]);

  return { values, errors, formError, submitting, setValue, setValues, setErrors, setFormError, handleChange, handleSubmit, reset };
}
