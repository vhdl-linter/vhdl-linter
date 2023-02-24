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
      myRec.child := 1;
      return myRec;
    end function;

    procedure proc is
      variable var: integer;
      variable myRec: rec;
    begin
      var := myRec.child;
      myRec.child := fu.child + var;
    end procedure;

  end protected body;
end package body;