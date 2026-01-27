'use client'
import React from 'react'
import { useTranslation } from 'react-i18next'

type Props = React.ComponentPropsWithoutRef<'span'>

const NewCourseButton = React.forwardRef<HTMLSpanElement, Props>(function NewCourseButton(
  props,
  ref
) {
  const { t } = useTranslation()
  return (
    <span
      ref={ref}
      role="button"
      tabIndex={0}
      {...props}
      className={[
        'rounded-lg bg-black hover:scale-105 transition-all duration-100 ease-linear antialiased ring-offset-purple-800 p-2 px-5 my-auto font text-xs font-bold text-white drop-shadow-lg flex space-x-2 items-center cursor-pointer select-none',
        props.className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div>{t('courses.new_course')} </div>
      <div className="text-md bg-neutral-800 px-1 rounded-full">+</div>
    </span>
  )
})

export default NewCourseButton
