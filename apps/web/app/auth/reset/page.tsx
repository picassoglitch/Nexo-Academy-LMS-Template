import { Metadata } from 'next'
import React from 'react'
import ResetPasswordClient from './reset'

export const metadata: Metadata = {
    title: 'Nexo Academy - Reset Password',
}

function ResetPasswordPage() {
    return (
        <ResetPasswordClient />
    )
}

export default ResetPasswordPage