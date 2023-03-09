enum TriggerType{
    SET = 'set',
    DELETE = 'delete',
    ADD = 'add'
}

export default TriggerType

export let shouldTrack = {
    value: true,
    target: new Set()
}