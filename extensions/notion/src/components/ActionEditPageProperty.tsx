import {
  ActionPanel,
  Color,
  Icon,
  List,
  Detail,
  FormValues,
  ImageLike,
  preferences,
  showToast,
  ToastStyle,
  setLocalStorageItem,
  getLocalStorageItem,
  getApplications,
  closeMainWindow,
  CopyToClipboardAction,
  PasteAction,
  PushAction,
  ImageMask,
  useNavigation,
  Form,
  KeyboardShortcut,
  SubmitFormAction,
} from '@raycast/api'
import { useEffect, useState } from 'react'
import {
  DatabaseView,
  Page,
  DatabaseProperty,
  DatabasePropertyOption,
  PageContent,
  User,
  searchPages,
  queryDatabase,
  fetchDatabaseProperties,
  fetchPageContent,
  notionColorToTintColor,
  patchPage,
  fetchUsers,
  fetchDatabases
} from '../utils/notion'
import {
  storeRecentlyOpenedPage,
  loadRecentlyOpenedPages,
  storeDatabaseView,
  loadDatabaseView,
  storeDatabases,
  loadDatabases,
  storeDatabaseProperties,
  loadDatabaseProperties,
  storeDatabasePages,
  loadDatabasePages,
  storeUsers,
  loadUsers,
} from '../utils/local-storage'
import {
  ActionSetVisibleProperties,
  CreateDatabaseForm,
  DatabaseViewForm,
  DatabaseKanbanView,
  PageListItem,
} from './'
import moment from 'moment'
import open from 'open'








export function ActionEditPageProperty(props: { databaseProperty: DatabaseProperty, pageId: string, pageProperty: any, setRefreshView: any, shortcut?: KeyboardShortcut, icon?: ImageLike, customOptions?: DatabasePropertyOption[] }): JSX.Element | null {
  const dp = props.databaseProperty
  const propertyType = dp.type
  const pageId = props.pageId
  const pageProperty = props.pageProperty
  const pagePropertyValue = (( pageProperty && pageProperty[propertyType] ) ? pageProperty[propertyType] : null)
  const setRefreshView = props.setRefreshView
  const shortcut = props.shortcut

  const title = 'Set '+dp.name
  const icon = (props.icon ? props.icon : 'icon/'+dp.type+'.png')
  const options = (props.customOptions ? props.customOptions : (dp.options ? dp.options : [])) 

  async function setPageProperty (propertyValue: any) {
    var patchedProperty: Record<string,any> = {}
    patchedProperty[dp.id] = {}
    patchedProperty[dp.id][dp.type] = propertyValue
    showToast(ToastStyle.Animated, 'Updating Property')
    const updatedPage = await  patchPage(pageId, patchedProperty)
    if(updatedPage && updatedPage.id){
      showToast(ToastStyle.Success, 'Property Updated')  
      setRefreshView(Date.now())
    }   
  }
  
  

  switch (dp.type) {    
    
    case 'checkbox':
      return (<ActionPanel.Item 
        title={( pageProperty?.checkbox ? 'Uncheck ' : 'Check ')+dp.name} 
        icon={'icon/'+dp.type+'_'+pageProperty?.checkbox+'.png'} 
        shortcut={shortcut}
        onAction={function () {                     
          setPageProperty(!pageProperty?.checkbox)              
        }}/>)
      break
    
    case 'select': 
      return (                  
        <ActionPanel.Submenu 
          title={title}
          icon={icon}
          shortcut={shortcut}>
          {(options as DatabasePropertyOption[])?.map(function (opt) {
            return (<ActionPanel.Item 
              icon={((opt.icon ? opt.icon : opt.id !== '_select_null_') ? {source: (opt.icon ? opt.icon : (pagePropertyValue?.id === opt.id ? Icon.Checkmark : Icon.Circle)), tintColor: notionColorToTintColor(opt.color)} : undefined )} 
              title={( opt.name ? opt.name : 'Untitled' ) + (opt.icon && pagePropertyValue?.id === opt.id ? '  ✓' : '')}
              onAction={function () {
                if(opt.id !== '_select_null_'){
                  setPageProperty({ id : opt.id })
                } else {
                 setPageProperty(null)
                }                       
              }}/>)
          })}
       </ActionPanel.Submenu>
      )
      break
    
    case 'date': 
      return (                  
        <ActionPanel.Submenu 
          title={title}
          icon={icon}
          shortcut={shortcut}>
          <ActionPanel.Submenu 
            title={(pagePropertyValue?.start ? moment(pagePropertyValue.start).fromNow() : 'No Date')}
            icon={'icon/date_start.png'}>   
              <ActionPanel.Item                         
              title='Now'
              onAction={function () {
                var dateProperty = (pagePropertyValue ? pagePropertyValue : {})
                dateProperty.start = new Date(Date.now()).toISOString()
                setPageProperty(dateProperty)                       
              }}/>                     
          </ActionPanel.Submenu>
          <ActionPanel.Submenu 
            title={(pagePropertyValue?.end ? moment(pagePropertyValue.end).fromNow() : 'No Date')}
            icon={'icon/date_end.png'}>  
            <ActionPanel.Item                         
              title='Now'
              onAction={function () {
                var dateProperty = (pagePropertyValue ? pagePropertyValue : {})
                dateProperty.end = new Date(Date.now()).toISOString()
                setPageProperty(dateProperty)               
              }}/>                            
          </ActionPanel.Submenu>                    
        </ActionPanel.Submenu>
      )
      break
    
    case 'multi_select':   
      const multiSelectIds:string[] = []
      pagePropertyValue?.forEach(function (selection: Record<string,any>){
        multiSelectIds.push(selection.id as string)
      })
      return (
        <ActionPanel.Submenu 
          title={title}
          icon={icon}
          shortcut={shortcut}>
          {(options as DatabasePropertyOption[])?.map(function (opt) {
            return (<ActionPanel.Item 
              icon={{source: (multiSelectIds.includes(opt.id) ? Icon.Checkmark : Icon.Circle), tintColor: notionColorToTintColor(opt.color)}} 
              title={opt.name}
              onAction={function () {
                const multiSelectProperty = (pagePropertyValue ? pagePropertyValue : [])
                if(multiSelectIds.includes(opt.id)){
                  setPageProperty(multiSelectProperty.filter(function (o: DatabasePropertyOption){
                    return o.id !== opt.id
                  }))
                } else {
                  multiSelectProperty.push({id: opt.id})
                  setPageProperty(multiSelectProperty)
                }                            
              }}/>)
          })}
       </ActionPanel.Submenu>
      )
      break
    
    case 'people':   
      const peopleIds:string[] = []
      pageProperty[dp.type]?.forEach(function (user: Record<string,any>){
        peopleIds.push(user.id as string)
      })
      return (
        <ActionPanel.Submenu 
          title={title}
          icon={icon}
          shortcut={shortcut}>
          <ActionPanel.Section>
            {pagePropertyValue?.map(function (user: User) {
              return (<ActionPanel.Item 
                icon={(user?.avatar_url ? {source:user.avatar_url, mask: ImageMask.Circle} : undefined )} 
                title={user.name+'  ✓'}
                onAction={function () {
                  const peopleProperty = (pagePropertyValue ? pagePropertyValue : [])
                  if(peopleIds.includes(user.id)){
                    setPageProperty(peopleProperty.filter(function (o: DatabasePropertyOption){
                      return o.id !== user.id
                    }))
                  }                  
                }}/>)
            })}
          </ActionPanel.Section>
          <ActionPanel.Section>
          {(options as User[])?.map(function (user) {
            if(!peopleIds.includes(user.id)){
              return (<ActionPanel.Item 
              icon={( user?.avatar_url ? {source:user.avatar_url, mask: ImageMask.Circle} : undefined )} 
              title={( user?.name ? user.name : 'Unknown' )}
              onAction={async function () {
                const peopleProperty = (pagePropertyValue ? pagePropertyValue : [])
                peopleProperty.push({id: user.id})
                setPageProperty(peopleProperty)               
              }}/>)
            }                      
          })}
        </ActionPanel.Section>
       </ActionPanel.Submenu>
      )
      break

    default:
      return null
      break
  }  
}