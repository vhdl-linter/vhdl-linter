package function_record_return is
  type rec is record
    elem0: integer;
    elem1: integer;
  end record;
  function noParam return rec;
  function withParam(par: integer) return rec;
end package;
package body function_record_return is
  function noParam return rec is
    variable x: rec;
  begin
    x.elem0 := noParam.elem1;
    return x;
  end function;

  function withParam(par: integer) return rec is
    variable x: rec;
  begin
    x.elem1 := withParam(par).elem0;
    return x;
  end function;
  
end package body;