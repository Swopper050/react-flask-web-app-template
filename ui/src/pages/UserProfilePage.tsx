import { createSignal, JSXElement, Show } from 'solid-js'
import { useUser } from '../context'
import { clsx } from 'clsx'

import api from '../api'
import { PasswordIcon } from '../components/icons/Password'
import { isGoodPassword, passwordConditions } from '../components/utils'
import { User } from '../models/User'

export function UserProfilePage(): JSXElement {
  const { user } = useUser()

  const [openPasswordModal, setOpenPasswordModal] = createSignal(false)

  return (
    <div class="mt-4 ml-10">
      <Show when={user().isAdmin}>
        <p class="text-lg text-success mr-4 mb-6 col-span-4">
          <i class="fa-solid fa-screwdriver-wrench mr-2" />
          This user is an admin
        </p>
      </Show>

      <div class="grid grid-cols-3 gap-4">
        <p class="text-lg font-bold mr-4 col-span-1">Email:</p>
        <p class="text-lg col-span-1">{user().email}</p>
        <p class="col-span-1">
          <Show when={user().isVerified} fallback={<VerifyEmailWarning />}>
            <p class="ml-4 tooltip" data-tip="Your email has been verified">
              <i class="fa-solid fa-check text-success" />
            </p>
          </Show>
        </p>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <p class="text-lg font-bold mr-4 col-span-1">Password:</p>
        <p class="text-lg col-span-1">*******</p>
        <p class="ml-4 tooltip" data-tip="Your email has been verified">
          <button
            class={clsx('btn btn-ghost btn-sm')}
            onClick={() => setOpenPasswordModal(true)}
          >
            <i class="fa-solid fa-edit" />
          </button>
        </p>
      </div>

      <ChangePasswordModal
        isOpen={openPasswordModal()}
        onClose={() => setOpenPasswordModal(false)}
      />
    </div>
  )
}

function createPasswordState() {
  const { setUser } = useUser()

  const [currentPassword, setCurrentPassword] = createSignal<string | null>(
    null
  )
  const [newPassword, setNewPassword] = createSignal<string | null>(null)
  const [confirmNewPassword, setConfirmNewPassword] = createSignal<
    string | null
  >(null)
  const [errorMsg, setErrorMsg] = createSignal<string | null>(null)
  const [successMsg, setSuccessMsg] = createSignal<string | null>(null)
  const [submitting, setSubmitting] = createSignal(false)

  const canChangePassword = () => {
    return (
      currentPassword() !== null &&
      newPassword() !== null &&
      newPassword() === confirmNewPassword()
    )
  }

  const changePassword = () => {
    setSubmitting(true)
    setErrorMsg(null)

    api
      .post(
        '/change_password',
        JSON.stringify({
          current_password: currentPassword(),
          new_password: newPassword(),
        })
      )
      .then((response) => {
        setUser(new User(response.data))
        setSuccessMsg('Password changed successfully')
        setTimeout(() => setSuccessMsg(null), 5000)
      })
      .catch((error) => {
        setErrorMsg(error.response.data.error_message)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  return {
    changePassword,
    currentPassword,
    setNewPassword,
    setCurrentPassword,
    newPassword,
    errorMsg,
    submitting,
    successMsg,
    canChangePassword,
    confirmNewPassword,
    setConfirmNewPassword,
  }
}

function ChangePasswordModal(props: {
  isOpen: boolean
  onClose: () => void
}): JSXElement {
  const {
    changePassword,
    currentPassword,
    setNewPassword,
    setCurrentPassword,
    newPassword,
    errorMsg,
    submitting,
    successMsg,
    canChangePassword,
    confirmNewPassword,
    setConfirmNewPassword,
  } = createPasswordState()

  // TODO show success in card where eisen also are checked.
  // TODO cut into smaller components
  // TODO save button
  return (
    <Modal
      title="Change password"
      isOpen={props.isOpen}
      onClose={props.onClose}
      submitButton={
        <button
          class={clsx(
            'btn btn-primary mt-6',
            (submitting() ||
              !canChangePassword() ||
              !isGoodPassword(newPassword())) &&
              'btn-disabled'
          )}
          onClick={changePassword}
        >
          <Show when={submitting()}>
            <span class="loading loading-spinner" />
          </Show>
          Save
        </button>
      }
    >
      <>
        <div class="mt-5" />
        {passwordConditions()}
        <div class="flex items-center mt-6">
          <Show when={successMsg() !== null}>
            <p class="text-base text-success ml-6">
              <i class="fa-solid fa-check mr-2" />
              {successMsg()}
            </p>
          </Show>
        </div>

        <Show when={errorMsg() !== null}>
          <div role="alert" class="alert alert-error mt-6">
            <span>{errorMsg()}</span>
          </div>
        </Show>

        <div class="my-2">
          <PasswordField
            value={currentPassword()}
            onChange={setCurrentPassword}
          />

          <PasswordField
            value={newPassword()}
            onChange={setNewPassword}
            validator={(value) => {
              if (!isGoodPassword(value)) {
                return 'Password does not match requirements.'
              }

              return ''
            }}
          />

          <PasswordField
            value={confirmNewPassword()}
            onChange={setConfirmNewPassword}
            validator={(value) => {
              if (value !== newPassword()) {
                return 'Passwords do not match.'
              }

              return ''
            }}
          />
        </div>
      </>
    </Modal>
  )
}

function PasswordField(props: {
  value: string
  placeholder?: string
  onChange: (password: string) => void
  validator?: (value: string) => string
}): JSXElement {
  const [validationError, setValidationError] = createSignal('')

  return (
    <>
      <label
        class={clsx(
          'input input-bordered flex items-center mt-2',
          validationError() !== '' && 'input-error'
        )}
      >
        <PasswordIcon />
        <input
          type="password"
          class="grow ml-2"
          placeholder={props.placeholder ?? 'Password'}
          value={props.value}
          onInput={(e) => props.onChange(e.target.value.trim())}
          onBlur={(e) =>
            setValidationError(props.validator(e.target.value.trim()))
          }
        />
      </label>
      <Show when={validationError() !== ''} fallback={<div class="mt-9" />}>
        <div class="label">
          <span class="label-text-alt text-error">{validationError()}</span>
        </div>
      </Show>
    </>
  )
}

function Modal(props: {
  title: string
  isOpen: boolean
  children: JSXElement | JSXElement[]
  submitButton?: JSXElement
  onClose: () => void
}): JSXElement {
  const isOpen = () => props.isOpen

  // TODO let user pass in own close handler
  // TODO migrate to components
  return (
    <>
      <dialog class={clsx('modal', isOpen() ? 'modal-open' : 'modal-close')}>
        <div class="modal-box">
          <h3 class="font-bold text-lg">{props.title}</h3>
          {props.children}
          <div class="modal-action">
            <form method="dialog">
              <Show
                when={props.submitButton}
                fallback={
                  <button onClick={() => props.onClose()} class="btn">
                    Close
                  </button>
                }
              >
                {props.submitButton}
              </Show>
            </form>
          </div>
        </div>
      </dialog>
    </>
  )
}

function VerifyEmailWarning(): JSXElement {
  const [sending, setSending] = createSignal(false)

  const resendVerificationMail = () => {
    setSending(true)
    api.post('/resend_email_verification').finally(() => setSending(false))
  }

  return (
    <>
      <span class="ml-4 tooltip" data-tip="Your email is not verified yet">
        <i class="fa-solid fa-triangle-exclamation text-warning" />
      </span>
      <span class="ml-4 tooltip" data-tip="Resend verification mail">
        <button
          class={clsx('btn btn-ghost btn-sm', sending() && 'btn-disabled')}
          onClick={resendVerificationMail}
        >
          <Show when={sending()}>
            <span class="loading loading-ball loading-sm" />
          </Show>
          <i class="fa-solid fa-arrow-rotate-left" />
        </button>
      </span>
    </>
  )
}
