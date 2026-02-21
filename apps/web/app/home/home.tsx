'use client'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import UserAvatar from '@components/Objects/UserAvatar';
import { getAPIUrl, getUriWithOrg, getUriWithoutOrg } from '@services/config/config';
import { swrFetcher } from '@services/utils/ts/requests';
import { ArrowRight, LogOut, Settings, Languages, Check } from 'lucide-react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import nexoIcon from 'public/learnhouse_bigicon_1.png'
import React, { useEffect } from 'react'
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@components/ui/dropdown-menu"
import { AVAILABLE_LANGUAGES } from '@/lib/languages';

function HomeClient() {
  const { t, i18n } = useTranslation();
  const session = useLHSession() as any;
  const access_token = session?.data?.tokens?.access_token;
  const { data: orgs } = useSWR(`${getAPIUrl()}orgs/user/page/1/limit/10`, (url) => swrFetcher(url, access_token))

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  useEffect(() => {
  }, [session, orgs])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ede8d8] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center space-x-3">
          <Image quality={100} width={32} height={32} src={nexoIcon} alt="Nexo" />
          <span className="text-sm font-semibold tracking-[0.2em] uppercase text-[#c9a84c]">Nexo Academy</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center space-x-2 px-3 py-1.5 rounded-full border border-white/10 hover:border-[#c9a84c]/40 transition-all duration-200 cursor-pointer">
              <UserAvatar rounded="rounded-full" width={28} />
              <span className="text-sm text-[#ede8d8]/80 max-w-[120px] truncate">
                {session?.data?.user.first_name} {session?.data?.user.last_name}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-[#111] border-white/10" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <p className="text-sm font-medium text-[#ede8d8]">{session?.data?.user.first_name} {session?.data?.user.last_name}</p>
                <p className="text-xs text-[#ede8d8]/50">{session?.data?.user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center space-x-2 text-[#ede8d8]/70 hover:text-[#c9a84c]">
                <Languages size={14} />
                <span>{t('common.language')}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="bg-[#111] border-white/10">
                  {AVAILABLE_LANGUAGES.map((language) => (
                    <DropdownMenuItem
                      key={language.code}
                      onClick={() => changeLanguage(language.code)}
                      className="flex items-center justify-between text-[#ede8d8]/70 hover:text-[#c9a84c]"
                    >
                      <span>{t(language.translationKey)} ({language.nativeName})</span>
                      {i18n.language === language.code && <Check size={14} className="text-[#c9a84c]" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem asChild>
              <Link href="/dash/user-account/settings/general" className="flex items-center space-x-2 w-full text-[#ede8d8]/70 hover:text-[#c9a84c]">
                <Settings size={16} />
                <span>{t('common.settings')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem
              onClick={() => signOut({ redirect: true, callbackUrl: getUriWithoutOrg('/') })}
              className="flex items-center space-x-2 text-red-400 focus:text-red-400"
            >
              <LogOut size={16} />
              <span>{t('user.sign_out')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Hero section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="text-center mb-16 max-w-xl">
          <div className="inline-flex items-center space-x-2 bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] animate-pulse" />
            <span className="text-xs text-[#c9a84c] tracking-widest uppercase font-medium">Members Portal</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[#ede8d8] mb-3">
            {t('common.hello')},{' '}
            <span className="text-[#c9a84c]">{session?.data?.user.first_name}</span>
          </h1>
          <p className="text-sm text-[#ede8d8]/40 tracking-wide">
            {t('common.your_organizations')}
          </p>
        </div>

        {/* Org cards */}
        <div className="w-full max-w-2xl space-y-3">
          {orgs && orgs.length === 0 && (
            <div className="flex items-center justify-center space-x-3 bg-amber-900/20 border border-amber-700/30 rounded-xl px-5 py-4 text-amber-400/80 text-sm">
              <span>{t('common.no_orgs_message')}</span>
            </div>
          )}
          {orgs && orgs.map((org: any) => (
            <Link
              href={getUriWithOrg(org.slug, '/')}
              key={org.id}
              className="group flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-[#c9a84c]/30 px-5 py-4 rounded-xl transition-all duration-200"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-[#c9a84c]/10 flex items-center justify-center text-[#c9a84c] font-bold text-sm uppercase">
                  {org.name?.charAt(0)}
                </div>
                <span className="font-medium text-[#ede8d8]">{org.name}</span>
              </div>
              <ArrowRight size={16} className="text-[#ede8d8]/30 group-hover:text-[#c9a84c] transition-colors duration-200" />
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-white/5">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#ede8d8]/20">Nexo Academy — Restricted Access</p>
      </footer>
    </div>
  )
}

export default HomeClient
