import React, { useReducer } from 'react'

const init = {
	title: 'New Foreign Language Widget',
	items: [],
	legend: [],
	currentIndex: 0,
	requireInit: true
}

const store = React.createContext(init)
const { Provider } = store

const shuffle = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array
}

const importFromQset = (qset) => {
	return {
		items: qset.items.map((item) => {
			return {
				question: item.questions[0].text,
				answer: item.answers[0].text,
				phrase: shuffle(item.answers[0].options.phrase.map((token) => {
					return {...token, status: 'unsorted'}
				})),
				sorted: [],
				displayPref: item.options.displayPref
			}
		}),
		legend: qset.options.legend
	}
}

const convertSortedToString = (sorted) => {
	let string = ''
	for (let i=0;i<sorted.length;i++) {
		string += sorted[i].value + ','
	}
	return string.substring(0,string.length-1)
}

const tokenSortedPhraseReducer = (list, action) => {
	switch (action.type) {
		case 'token_dragging':
			return list.map((token, index) => {
				if (action.payload.tokenIndex == index) {
					return {
						...token,
						status: 'dragging'
					}
				}
				else return token
			})
		case 'token_drag_complete':
			return list.map((token, index) => {
				if (action.payload.tokenIndex == index) {
					return {
						...token,
						status: action.payload.origin
					}
				}
				else return token
			})
		case 'token_update_position':
			return list.map((token, index) => {
				if (action.payload.tokenIndex == index) {
					return {
						...token,
						position: {
							x: action.payload.x,
							width: action.payload.width
						}
					}
				}
				else return token
			})
		case 'response_token_sort':
			return [
					...list.slice(0, action.payload.targetIndex),
					{
						legend: action.payload.legend,
						value: action.payload.value,
						status: 'sorted',
						position: {},
						arrangement: null
					},
					...list.slice(action.payload.targetIndex)
				]
		case 'response_token_rearrange':
			let target = action.payload.targetIndex
			if (action.payload.originIndex < target) target--

			let stageOne = [
				...list.slice(0, action.payload.originIndex),
				...list.slice(action.payload.originIndex + 1)
			]

			return [
				...stageOne.slice(0, target),
				{
					legend: action.payload.legend,
					value: action.payload.value,
					status: 'sorted',
					position: {},
					arrangement: null
				},
				...stageOne.slice(target)
			]
		case 'adjacent_token_update':
			return list.map((token) => {
				
				if (action.payload.left != undefined && token.index == action.payload.left) {
					return {
						...token,
						arrangement: 'left'
					}
				}
				else if (action.payload.right != undefined && token.index == action.payload.right) {
					return {
						...token,
						arrangement: 'right'
					}
				}
				else return {
					...token,
					arrangement: null
				}
			})
		default:
			throw new Error(`Sorted Token phrase reducer: action type: ${action.type} not found.`)
	}
}

const tokenUnsortedPhraseReducer = (list, action) => {
	switch (action.type) {
		case 'token_dragging':
			return list.map((token, index) => {
				if (action.payload.tokenIndex == index) {
					return {
						...token,
						status: 'dragging'
					}
				}
				else return token
			})
		case 'token_drag_complete':
			return list.map((token, index) => {
				if (action.payload.tokenIndex == index) {
					return {
						...token,
						status: action.payload.origin
					}
				}
				else return token
			})
		case 'response_token_sort':
			return [
				...list.slice(0, action.payload.phraseIndex),
				...list.slice(action.payload.phraseIndex + 1)
			]
		default:
			throw new Error(`Token phrase reducer: action type: ${action.type} not found.`)
	}
}

const questionItemReducer = (items, action) => {
	switch (action.type) {
		case 'token_dragging':
			return items.map((item, index) => {
				if (index == action.payload.questionIndex) {
					if (action.payload.status == 'unsorted') return { ...item, phrase: tokenUnsortedPhraseReducer(item.phrase, action) }
					else if (action.payload.status == 'sorted') return {...item, sorted: tokenSortedPhraseReducer(item.sorted, action)}
				}
				else return item
			})
		case 'token_drag_complete': 
			return items.map((item, index) => {
				if (index == action.payload.questionIndex) {
					if (action.payload.origin == 'unsorted') return { ...item, phrase: tokenUnsortedPhraseReducer(item.phrase, action) }
					else if (action.payload.origin == 'sorted') return {...item, sorted: tokenSortedPhraseReducer(item.sorted, action)}
				}
				else return item
			})
		case 'response_token_sort':
			return items.map((item, index) => {
				if (index == action.payload.questionIndex) {
					return {...item, sorted: tokenSortedPhraseReducer(item.sorted, action), phrase: tokenUnsortedPhraseReducer(item.phrase, action)}
				}
				else return item
			})
		case 'response_token_rearrange':
		case 'token_update_position':
		case 'adjacent_token_update':
			return items.map((item, index) => {
				if (index == action.payload.questionIndex) {
					return {...item, sorted: tokenSortedPhraseReducer(item.sorted, action)}
				}
				else return item
			})
		default:
			throw new Error(`Question item reducer: action type: ${action.type} not found.`)
	}
}

const StateProvider = ( { children } ) => {
	const [state, dispatch] = useReducer((state, action) => {
		console.log(action)
		switch (action.type) {
			case 'init':
				let imported = importFromQset(action.payload.qset)
				return {...state, title: action.payload.title, items: imported.items, legend: imported.legend, requireInit: false}
			case 'select_question':
				return {...state, currentIndex: action.payload}
			case 'token_dragging':
			case 'token_drag_complete':
			case 'token_update_position':
			case 'response_token_sort':
			case 'response_token_rearrange':
			case 'adjacent_token_update':
				return {...state, items: questionItemReducer(state.items, action)}
			default:
				throw new Error(`Base reducer: action type: ${action.type} not found.`)
		}
	}, init)

	return <Provider value={{state, dispatch}}>{children}</Provider>
}

export {store, StateProvider }