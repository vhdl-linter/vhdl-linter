package pkg is
  type myType is protected
    procedure proc;
  end protected;
end package;

package body pkg is
  type myType is protected body
    type rec is record
      child: integer;
    end record;

    function fu return rec is
      variable myRec: rec;
    begin
      return myRec;
    end function;

    procedure proc is
      variable var: integer;
      variable myRec: rec;
    begin
      var := myRec.child;
      var := fu.child;
    end procedure;

  end protected body;
end package body;